import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  const { transcript } = await request.json();
  if (!transcript || typeof transcript !== "string") {
    return NextResponse.json({ error: "Missing transcript" }, { status: 400 });
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 400,
    system: `Tu es un assistant qui extrait les informations d'une séance d'entraînement équestre depuis un texte dicté à voix haute.
Extrait les champs suivants et retourne un JSON pur (sans markdown) :
- type: un de ces types exactement: "dressage" | "saut" | "endurance" | "cso" | "cross" | "travail_a_pied" | "longe" | "galop" | "plat" | "autre"
- duration_min: durée en minutes (nombre entier, 1-300)
- intensity: intensité de 1 à 5 (1=très léger, 5=très intense)
- feeling: ressenti du cheval de 1 à 5 (1=très mauvais, 5=excellent)
- notes: résumé des observations en 1-2 phrases (string ou null)

Si une info n'est pas mentionnée, utilise ces valeurs par défaut: type="autre", duration_min=45, intensity=3, feeling=3, notes=null.
Réponds uniquement avec le JSON, sans explication.`,
    messages: [
      {
        role: "user",
        content: `Transcription vocale : "${transcript}"`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    return NextResponse.json({ error: "Unexpected Claude response" }, { status: 500 });
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON");
    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Parse error" }, { status: 500 });
  }
}
