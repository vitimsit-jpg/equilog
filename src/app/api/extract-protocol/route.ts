import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { horseId, horseName, examType, examDate, vetName, description, results } = await req.json();
  if (!horseId || (!results && !description)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify the user owns this horse
  const { data: horse } = await supabase.from("horses").select("id, name").eq("id", horseId).eq("user_id", user.id).single();
  if (!horse) return NextResponse.json({ error: "Horse not found" }, { status: 404 });

  const prompt = `Tu es un assistant vétérinaire spécialisé en médecine équine. Analyse les résultats d'un examen médical et formule des recommandations concrètes pour le protocole de convalescence et de retour au travail.

Cheval : ${horseName ?? horse.name}
Type d'examen : ${examType}
Date : ${examDate}
${vetName ? `Vétérinaire : Dr ${vetName}` : ""}
${description ? `\nDescription / motif : ${description}` : ""}
${results ? `\nRésultats : ${results}` : ""}

Fournis une recommandation structurée et concise comprenant :
1. Interprétation des résultats
2. Restrictions / précautions immédiates
3. Calendrier de retour progressif au travail (phases et durées estimées)
4. Signes d'alarme à surveiller

Réponds en français, de façon claire et directement utilisable par le propriétaire. Rappelle systématiquement que ces recommandations ne remplacent pas l'avis du vétérinaire traitant.`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });

  const recommendation = (message.content[0] as { type: string; text: string }).text ?? "";

  return NextResponse.json({ recommendation });
}
