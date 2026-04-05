import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { formatDate } from "@/lib/utils";
import { parseBody, CoachChatSchema } from "@/lib/schemas";

const PROFILE_TONE: Record<string, string> = {
  // Canonical 4-profile system
  loisir: "Adopte un ton chaleureux et encourageant. Évite le jargon technique.",
  competition: "Adopte un ton analytique orienté performance. Sois précis sur les chiffres.",
  pro: "Adopte un ton expert et synthétique. Utilise le vocabulaire technique.",
  gerant: "Focus sur la santé, les soins et la gestion de la structure. Sois synthétique.",
  // Legacy fallbacks
  gerant_cavalier: "Adopte un ton professionnel et structuré. Sois synthétique.",
  coach: "Adopte un ton pédagogique. Analyse dans une logique d'enseignement.",
  gerant_ecurie: "Focus sur la santé, les soins et la gestion.",
};

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const parsed = parseBody(CoachChatSchema, await request.json());
  if (!parsed.success) return parsed.response;
  const { horseId, messages } = parsed.data;

  const [
    { data: horse },
    { data: userProfile },
  ] = await Promise.all([
    supabase.from("horses").select("*").eq("id", horseId).eq("user_id", user.id).single(),
    supabase.from("users").select("profile_type, user_type, module_coach, rider_niveau, rider_objectif, rider_frequence, rider_disciplines, rider_zones_douloureuses, rider_asymetrie, rider_pathologies, rider_suivi_corps").eq("id", user.id).single(),
  ]);

  if (!horse) return new Response("Horse not found", { status: 404 });

  const [
    { data: recentSessions },
    { data: healthRecords },
    { data: competitions },
    { data: scores },
  ] = await Promise.all([
    supabase.from("training_sessions").select("*").eq("horse_id", horseId).order("date", { ascending: false }).limit(20),
    supabase.from("health_records").select("*").eq("horse_id", horseId).order("date", { ascending: false }).limit(10),
    supabase.from("competitions").select("*").eq("horse_id", horseId).order("date", { ascending: false }).limit(5),
    supabase.from("horse_scores").select("*").eq("horse_id", horseId).order("computed_at", { ascending: false }).limit(1),
  ]);

  const currentScore = scores?.[0] ?? null;
  const userType = userProfile?.profile_type ?? userProfile?.user_type ?? "loisir";
  const toneInstruction = PROFILE_TONE[userType] || "";

  const moduleCoach = userProfile?.module_coach ?? false;
  const riderBasic = [
    userProfile?.rider_niveau && `Niveau : ${userProfile.rider_niveau}`,
    userProfile?.rider_objectif && `Objectif : ${userProfile.rider_objectif}`,
    userProfile?.rider_frequence && `Fréquence : ${userProfile.rider_frequence}×/semaine`,
    userProfile?.rider_disciplines?.length && `Disciplines : ${(userProfile.rider_disciplines as string[]).join(", ")}`,
  ].filter(Boolean).join(" | ");

  const riderAdvanced = moduleCoach ? [
    (userProfile?.rider_zones_douloureuses as string[] | null)?.length &&
      `Zones douloureuses : ${(userProfile?.rider_zones_douloureuses as string[]).join(", ")}`,
    userProfile?.rider_asymetrie && `Asymétrie : ${userProfile.rider_asymetrie}`,
    userProfile?.rider_pathologies && `Pathologies : ${userProfile.rider_pathologies}`,
    (() => {
      const sc = userProfile?.rider_suivi_corps as Record<string, { actif: boolean; frequence?: string }> | null;
      if (!sc || Object.keys(sc).length === 0) return null;
      const actifs = Object.entries(sc).filter(([, v]) => v.actif).map(([k, v]) => `${k}${v.frequence ? ` (${v.frequence})` : ""}`);
      return actifs.length ? `Suivi corps : ${actifs.join(", ")}` : null;
    })(),
  ].filter(Boolean).join("\n") : null;

  const riderLines = [riderBasic, riderAdvanced].filter(Boolean).join("\n");

  const systemPrompt = `Tu es Equistra Coach, un coach équestre IA expert intégré dans l'application Equistra.
Tu as accès aux données réelles de ce cheval et tu réponds aux questions de son propriétaire.
${toneInstruction}

Règles :
- Sois concis (3-6 phrases max par réponse sauf si on te demande plus de détail)
- Appuie-toi sur les données réelles ci-dessous
- Sois direct et actionnable
- Réponds toujours en français
- N'invente pas de données qui ne sont pas dans le contexte

## Profil cavalier${moduleCoach ? " (Coach activé)" : ""}${riderLines ? `\n${riderLines}` : " — non renseigné"}

## Données du cheval : ${horse.name}
Race: ${horse.breed || "—"} | Discipline: ${horse.discipline || "—"} | Né en: ${horse.birth_year || "—"}
Écurie: ${horse.ecurie || "—"} | Région: ${horse.region || "—"}

## Horse Index actuel : ${currentScore?.score ?? "Non calculé"}/100
${currentScore ? `Régularité: ${currentScore.score_breakdown?.regularite ?? "N/A"}/25 | Progression: ${currentScore.score_breakdown?.progression ?? "N/A"}/25 | Santé: ${currentScore.score_breakdown?.sante ?? "N/A"}/20 | Récupération: ${currentScore.score_breakdown?.recuperation ?? "N/A"}/20` : ""}

## Séances récentes (${(recentSessions || []).length} dernières)
${(recentSessions || []).slice(0, 10).map((s) => `- ${formatDate(s.date)}: ${s.type}, ${s.duration_min}min, intensité ${s.intensity}/5, ressenti ${s.feeling ?? "—"}/5${s.notes ? `, "${s.notes}"` : ""}`).join("\n") || "Aucune séance"}

## Soins récents
${(healthRecords || []).slice(0, 6).map((h) => `- ${formatDate(h.date)}: ${h.type}${h.next_date ? ` (prochain: ${formatDate(h.next_date)})` : ""}${h.notes ? `, ${h.notes}` : ""}`).join("\n") || "Aucun soin"}

## Concours
${(competitions || []).map((c) => `- ${formatDate(c.date)}: ${c.event_name} (${c.discipline})${c.result_rank && c.total_riders ? `, ${c.result_rank}e/${c.total_riders}` : ""}`).join("\n") || "Aucun concours"}`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system: systemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
