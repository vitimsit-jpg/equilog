import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { formatDate } from "@/lib/utils";

const PROFILE_TONE: Record<string, string> = {
  loisir: "Adopte un ton chaleureux et encourageant. Évite le jargon technique.",
  competition: "Adopte un ton analytique orienté performance. Sois précis sur les chiffres.",
  pro: "Adopte un ton expert et synthétique. Utilise le vocabulaire technique.",
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

  const { horseId, messages } = await request.json();
  if (!horseId || !messages?.length) return new Response("Bad request", { status: 400 });

  const [
    { data: horse },
    { data: userProfile },
  ] = await Promise.all([
    supabase.from("horses").select("*").eq("id", horseId).eq("user_id", user.id).single(),
    supabase.from("users").select("user_type").eq("id", user.id).single(),
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
  const userType = userProfile?.user_type ?? "loisir";
  const toneInstruction = PROFILE_TONE[userType] || "";

  const systemPrompt = `Tu es Equilog Coach, un coach équestre IA expert intégré dans l'application Equilog.
Tu as accès aux données réelles de ce cheval et tu réponds aux questions de son propriétaire.
${toneInstruction}

Règles :
- Sois concis (3-6 phrases max par réponse sauf si on te demande plus de détail)
- Appuie-toi sur les données réelles ci-dessous
- Sois direct et actionnable
- Réponds toujours en français
- N'invente pas de données qui ne sont pas dans le contexte

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
    model: "claude-sonnet-4-20250514",
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
