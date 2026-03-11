import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { frames, horseName, discipline } = await request.json();

  if (!frames || !Array.isArray(frames) || frames.length === 0) {
    return NextResponse.json({ error: "No frames provided" }, { status: 400 });
  }

  const imageBlocks = frames.map((frame: string) => ({
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: "image/jpeg" as const,
      data: frame,
    },
  }));

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Tu es un coach équestre expert. Analyse ces ${frames.length} images extraites d'une vidéo du cheval ${horseName}${discipline ? ` (discipline principale : ${discipline})` : ""}.

Retourne une analyse JSON structurée (sans markdown) avec exactement ces champs :
- allure: l'allure principale observée parmi "pas", "trot", "galop", "saut", "travail à pied", "autre"
- score: note globale de 1 à 10 (entier)
- posture_cheval: analyse de la posture, du mouvement et de l'engagement du cheval (2-3 phrases)
- position_cavalier: analyse de la position, de l'assiette et des aides du cavalier si visible (2-3 phrases, ou null si le cavalier n'est pas visible)
- points_forts: tableau de 2-3 points forts observés (strings courts)
- axes_amelioration: tableau de 2-3 axes d'amélioration concrets (strings courts)
- conseil_principal: le conseil le plus prioritaire et actionnable (1-2 phrases)

Réponds uniquement avec le JSON, sans texte avant ou après.`,
          },
          ...imageBlocks,
        ],
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    return NextResponse.json({ error: "Unexpected response" }, { status: 500 });
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch {
    return NextResponse.json({ error: "Parse error", raw: content.text }, { status: 500 });
  }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[video-analysis]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
