import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getDisciplineContext(discipline: string | null | undefined): string {
  switch (discipline) {
    case "CSO":
      return `En tant que spécialiste du Saut d'Obstacles, évalue en priorité : l'impulsion et l'engagement avant l'obstacle, la bascule et la symétrie au saut, la gestion des distances et trajectoires, l'équilibre à la réception, et la position du cavalier (talons enfoncés, accompagnement des mains, regard).`;

    case "Dressage":
      return `En tant que spécialiste du Dressage, évalue en priorité : l'engagement des postérieurs et la poussée, la cadence et la régularité de l'allure, la rectitude sur la ligne, la mise en main et l'acceptance du contact, la souplesse du dos et la légèreté aux aides.`;

    case "CCE":
      return `En tant que spécialiste du Concours Complet, évalue en priorité : l'équilibre et l'engagement en terrain varié, l'abord et la technique aux obstacles de cross, la position cross du cavalier (dos plat, regard, rênes courtes), l'énergie cinétique conservée entre les obstacles, et la condition physique visible du cheval.`;

    case "Endurance":
      return `En tant que spécialiste de l'Endurance, évalue en priorité : l'économie du mouvement et l'amplitude de foulée, la régularité de l'allure, la décontraction et le confort du cheval, la position économique du cavalier (allégement du dos), et les signes de fatigue ou de récupération.`;

    case "Attelage":
      return `En tant que spécialiste de l'Attelage, évalue en priorité : le tracé et la précision des trajectoires, l'équilibre et la régularité des allures, le contact harmonieux aux rênes longues, la coordination du ou des chevaux, et la posture et précision du meneur.`;

    case "Voltige":
      return `En tant que spécialiste de la Voltige, évalue en priorité : la régularité du galop et la cadence du cheval, l'équilibre et la rondeur du cercle de longe, la décontraction et l'impulsion du cheval, et si visible, la coordination entre le cheval et le voltigeur.`;

    case "TREC":
      return `En tant que spécialiste du TREC, évalue en priorité : la qualité et la maîtrise des allures (marche rapide, galop lent), le calme et l'obéissance aux aides, la maniabilité et la précision, la position du cavalier en terrain naturel, et la gestion de l'effort sur la durée.`;

    case "Hunter":
      return `En tant que spécialiste du Hunter, évalue en priorité : la régularité et la cadence au galop de chasse, l'esthétique du saut (bascule symétrique, genoux relevés), la fluidité des trajectoires et des courbes, le style du cavalier, et l'harmonie et la présentation globale.`;

    case "Equitation_Western":
    case "Équitation Western":
      return `En tant que spécialiste de l'Équitation Western, évalue en priorité : la lenteur et la fluidité des allures, le calme et la décontraction totale du cheval, la souplesse et la discrétion des transitions, la position Western du cavalier (assis profond, une main), et si visible, la précision des figures (reining, maniabilité).`;

    default:
      return "";
  }
}

function buildPrompt(frameCount: number, horseName: string, discipline: string | null | undefined): string {
  const disciplineContext = getDisciplineContext(discipline);
  const displayName = discipline === "Equitation_Western" ? "Équitation Western" : discipline;
  const disciplineLabel = displayName && displayName !== "Autre" ? ` spécialisé en ${displayName}` : "";

  return `Tu es un coach équestre expert${disciplineLabel}. Analyse ces ${frameCount} images extraites d'une vidéo du cheval ${horseName}.
${disciplineContext ? `\n${disciplineContext}\n` : ""}
Retourne une analyse JSON structurée (sans markdown) avec exactement ces champs :
- allure: l'allure principale observée parmi "pas", "trot", "galop", "saut", "travail à pied", "autre"
- score: note globale de 1 à 10 (entier), en tenant compte des critères spécifiques à la discipline
- posture_cheval: analyse de la posture, du mouvement et de l'engagement du cheval (2-3 phrases)
- position_cavalier: analyse de la position, de l'assiette et des aides du cavalier si visible (2-3 phrases, ou null si le cavalier n'est pas visible)
- points_forts: tableau de 2-3 points forts observés (strings courts, spécifiques à la discipline)
- axes_amelioration: tableau de 2-3 axes d'amélioration concrets (strings courts, spécifiques à la discipline)
- conseil_principal: le conseil le plus prioritaire et actionnable pour cette discipline (1-2 phrases)

Réponds uniquement avec le JSON, sans texte avant ou après.`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { frames, horseName, discipline, horseId } = await request.json();

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
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: buildPrompt(frames.length, horseName, discipline),
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

    let result;
    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      result = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({ error: "Parse error", raw: content.text }, { status: 500 });
    }

    // Save to DB if horseId provided
    let analysisId: string | null = null;
    if (horseId) {
      const { data: inserted } = await supabase.from("video_analyses").insert({
        horse_id: horseId,
        user_id: user.id,
        allure: result.allure,
        score: result.score,
        posture_cheval: result.posture_cheval,
        position_cavalier: result.position_cavalier ?? null,
        points_forts: result.points_forts,
        axes_amelioration: result.axes_amelioration,
        conseil_principal: result.conseil_principal,
      }).select("id").single();
      analysisId = inserted?.id ?? null;
    }

    return NextResponse.json({ ...result, analysisId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[video-analysis]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
