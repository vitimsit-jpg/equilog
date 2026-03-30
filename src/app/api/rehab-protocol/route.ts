import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { format, addDays, addWeeks, startOfWeek } from "date-fns";
import type { RehabPhase } from "@/lib/supabase/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Day offsets by sessions_per_week
const SESSION_DAYS: Record<number, number[]> = {
  1: [2],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
};

function getNextMonday(from: Date): Date {
  const monday = startOfWeek(from, { weekStartsOn: 1 });
  // If today is already Monday or later in the week, go to next Monday
  if (from >= monday) {
    return addDays(monday, 7);
  }
  return monday;
}

function generateSessionsForPhase(
  horseId: string,
  phase: RehabPhase,
  startMonday: Date
): Array<{
  horse_id: string;
  date: string;
  type: string;
  duration_min_target: number;
  intensity_target: number;
  notes: string | null;
  status: string;
}> {
  const days = SESSION_DAYS[phase.sessions_per_week] ?? SESSION_DAYS[3];
  const sessions = [];

  for (let week = 0; week < phase.duration_weeks; week++) {
    const weekStart = addWeeks(startMonday, week);
    for (const dayOffset of days) {
      const sessionDate = addDays(weekStart, dayOffset);
      sessions.push({
        horse_id: horseId,
        date: format(sessionDate, "yyyy-MM-dd"),
        type: phase.allowed_types[0],
        duration_min_target: phase.max_duration_min,
        intensity_target: phase.max_intensity,
        notes: `Phase ${phase.index + 1} — ${phase.name}`,
        status: "planned",
      });
    }
  }

  return sessions;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createSupabase(cookieStore: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options: unknown }[]) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createSupabase(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { horseId, injuryDescription, vetNotes } = await request.json();
  if (!horseId || !injuryDescription) {
    return NextResponse.json({ error: "Missing horseId or injuryDescription" }, { status: 400 });
  }

  const { data: horse } = await supabase
    .from("horses")
    .select("*")
    .eq("id", horseId)
    .eq("user_id", user.id)
    .single();

  if (!horse) return NextResponse.json({ error: "Horse not found" }, { status: 404 });

  // Fetch recent sessions (14 days)
  const cutoff = format(addDays(new Date(), -14), "yyyy-MM-dd");
  const { data: recentSessions } = await supabase
    .from("training_sessions")
    .select("*")
    .eq("horse_id", horseId)
    .gte("date", cutoff)
    .order("date", { ascending: false });

  const sessionList = (recentSessions || [])
    .map((s: { date: string; type: string; duration_min: number; intensity: number }) =>
      `- ${s.date} : ${s.type}, ${s.duration_min}min, intensité ${s.intensity}/5`
    )
    .join("\n") || "Aucune";

  const prompt = `Tu es spécialiste en rééducation équine. Génère un protocole de rééducation pour :
Cheval : ${horse.name}, race : ${horse.breed || "non spécifiée"}, né en ${horse.birth_year || "?"}
Mode : Rééducation (IR)
Condition/Blessure : ${injuryDescription}
${vetNotes ? `Notes vétérinaire : ${vetNotes}` : ""}
Séances récentes (14j) : ${sessionList}

Génère 3 à 4 phases progressives en JSON strict, sans texte autour :
{
  "phases": [
    {
      "index": 0,
      "name": "Nom court de la phase",
      "duration_weeks": 2,
      "sessions_per_week": 2,
      "max_duration_min": 20,
      "max_intensity": 1,
      "allowed_types": ["travail_a_pied", "marcheur"],
      "description": "Ce que l'on fait pendant cette phase (2-3 phrases)",
      "progression_criteria": "Critères pour passer à la phase suivante (1-2 phrases)"
    }
  ]
}

Règles :
- Phase 0 : repos actif très léger (marcheur, travail_a_pied, max 20-30min, intensité 1)
- Phase 1 : travail léger (longe, plat, max 30-45min, intensité 1-2)
- Phase 2 : reprise progressive (intensité 2-3, durée croissante)
- Phase 3 (optionnelle) : retour au sport (intensité 3)
- max_intensity : 1, 2 ou 3 uniquement
- allowed_types parmi : dressage, saut, endurance, cso, cross, travail_a_pied, longe, galop, plat, marcheur, autre
- Sois conservateur pour la sécurité du cheval
- Retourne UNIQUEMENT le JSON`;

  let phases: RehabPhase[];
  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = JSON.parse(raw);
    phases = parsed.phases;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur Claude API";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Insert protocol
  const { data: protocol, error: insertError } = await supabase
    .from("rehab_protocols")
    .insert({
      horse_id: horseId,
      user_id: user.id,
      injury_description: injuryDescription,
      phases,
      current_phase_index: 0,
      status: "active",
      vet_validated: false,
      notes: vetNotes || null,
      generated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Generate sessions for phase 0 starting next Monday
  const startMonday = getNextMonday(new Date());
  const sessions = generateSessionsForPhase(horseId, phases[0], startMonday);

  if (sessions.length > 0) {
    const { error: sessionsError } = await supabase.from("training_planned_sessions").insert(sessions);
    if (sessionsError) return NextResponse.json({ error: sessionsError.message }, { status: 500 });
  }

  return NextResponse.json({ protocol, insertedCount: sessions.length });
}

export async function PATCH(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createSupabase(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { protocolId, action } = await request.json();
  if (!protocolId || !action) {
    return NextResponse.json({ error: "Missing protocolId or action" }, { status: 400 });
  }

  // Fetch protocol and verify ownership
  const { data: protocol } = await supabase
    .from("rehab_protocols")
    .select("*")
    .eq("id", protocolId)
    .eq("user_id", user.id)
    .single();

  if (!protocol) return NextResponse.json({ error: "Protocol not found" }, { status: 404 });

  let updatedProtocol;
  let insertedCount = 0;

  if (action === "advance") {
    if (protocol.current_phase_index >= protocol.phases.length - 1) {
      return NextResponse.json({ error: "Already at last phase" }, { status: 400 });
    }
    const newIndex = protocol.current_phase_index + 1;
    const { data: updated, error } = await supabase
      .from("rehab_protocols")
      .update({ current_phase_index: newIndex, updated_at: new Date().toISOString() })
      .eq("id", protocolId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    updatedProtocol = updated;

    // Generate sessions for new phase starting next Monday
    const startMonday = getNextMonday(new Date());
    const sessions = generateSessionsForPhase(protocol.horse_id, protocol.phases[newIndex], startMonday);
    if (sessions.length > 0) {
      const { error: sessionsError } = await supabase.from("training_planned_sessions").insert(sessions);
      if (sessionsError) return NextResponse.json({ error: sessionsError.message }, { status: 500 });
    }
    insertedCount = sessions.length;

  } else if (action === "complete") {
    const { data: updated, error } = await supabase
      .from("rehab_protocols")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", protocolId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    updatedProtocol = updated;

  } else if (action === "pause") {
    const { data: updated, error } = await supabase
      .from("rehab_protocols")
      .update({ status: "paused", updated_at: new Date().toISOString() })
      .eq("id", protocolId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    updatedProtocol = updated;

  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  return NextResponse.json({ protocol: updatedProtocol, insertedCount });
}
