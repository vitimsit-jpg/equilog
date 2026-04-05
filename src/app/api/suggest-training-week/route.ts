import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { format, addDays } from "date-fns";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VALID_TYPES = [
  "dressage", "saut", "endurance", "cso", "cross",
  "travail_a_pied", "longe", "galop", "plat", "marcheur", "autre",
];

const MODE_DESCRIPTIONS: Record<string, string> = {
  IC:  "compétition intensive — 5 à 6 séances/sem, intensité élevée (3-5)",
  ICr: "croisière — 4 à 5 séances/sem, intensité modérée à haute (2-4)",
  IP:  "semi-actif — 3 à 4 séances/sem, intensité modérée (2-3)",
  IE:  "loisir — 2 à 3 séances/sem, intensité légère (1-3)",
  IS:  "sénior — 2 à 3 séances légères/sem, privilégier le confort (1-2)",
  IR:  "rééducation — 2 à 3 séances légères/sem, progressivité stricte (1-2)",
};

export async function POST(request: NextRequest) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { horseId, weekStart } = await request.json();
  if (!horseId || !weekStart) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const { data: horse } = await supabase
    .from("horses")
    .select("name, horse_index_mode, discipline")
    .eq("id", horseId)
    .eq("user_id", user.id)
    .single();

  if (!horse) return NextResponse.json({ error: "Horse not found" }, { status: 404 });

  const since = new Date();
  since.setDate(since.getDate() - 14);

  const { data: recentSessions } = await supabase
    .from("training_sessions")
    .select("date, type, duration_min, intensity, feeling")
    .eq("horse_id", horseId)
    .gte("date", since.toISOString().split("T")[0])
    .order("date", { ascending: false });

  const mode = horse.horse_index_mode || "IE";
  const modeDesc = MODE_DESCRIPTIONS[mode] || MODE_DESCRIPTIONS.IE;
  const recentSummary = recentSessions?.length
    ? recentSessions.map((s) =>
        `  - ${s.date}: ${s.type}, ${s.duration_min}min, intensité ${s.intensity}/5, ressenti ${s.feeling}/5`
      ).join("\n")
    : "  Aucune séance récente";

  const prompt = `Tu es coach équestre expert. Génère un plan d'entraînement hebdomadaire pour le cheval "${horse.name}".

Mode actuel : ${modeDesc}
Discipline : ${horse.discipline || "non spécifiée"}
Semaine du : ${weekStart} (lundi)
Séances des 14 derniers jours :
${recentSummary}

Génère le plan en JSON strict, sans texte autour :
{
  "sessions": [
    { "day_offset": 0, "type": "dressage", "duration_min": 45, "intensity": 3, "notes": "objectif court" }
  ]
}

Règles :
- day_offset : 0=lundi … 6=dimanche
- Respecte la charge du mode (nombre de séances et intensité)
- Après une séance d'intensité 4-5, laisse au moins 1 jour de récupération (pas de séance le lendemain)
- Types valides : dressage, saut, endurance, cso, cross, travail_a_pied, longe, galop, plat, marcheur, autre
- intensity : entier 1-5
- notes : conseil court en français (max 60 caractères)`;

  let sessions: Array<{
    day_offset: number;
    type: string;
    duration_min: number;
    intensity: number;
    notes?: string;
  }>;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    ({ sessions } = JSON.parse(jsonMatch[0]));
    if (!Array.isArray(sessions)) throw new Error("Invalid sessions array");
  } catch {
    return NextResponse.json({ error: "Erreur lors de la génération IA" }, { status: 500 });
  }

  const weekStartDate = new Date(weekStart + "T00:00:00");

  const toInsert = sessions
    .filter((s) =>
      typeof s.day_offset === "number" &&
      s.day_offset >= 0 &&
      s.day_offset <= 6 &&
      VALID_TYPES.includes(s.type)
    )
    .map((s) => ({
      horse_id: horseId,
      date: format(addDays(weekStartDate, s.day_offset), "yyyy-MM-dd"),
      type: s.type,
      duration_min_target: Math.max(15, Math.min(300, parseInt(String(s.duration_min)) || 45)),
      intensity_target: Math.max(1, Math.min(5, parseInt(String(s.intensity)) || 3)) as 1 | 2 | 3 | 4 | 5,
      notes: s.notes ? String(s.notes).slice(0, 200) : null,
    }));

  if (toInsert.length === 0) {
    return NextResponse.json({ error: "Aucune séance valide générée" }, { status: 500 });
  }

  const { error } = await supabase.from("training_planned_sessions").insert(toInsert);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ count: toInsert.length });
}
