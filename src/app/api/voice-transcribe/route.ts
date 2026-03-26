import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VALID_TYPES = new Set([
  "dressage", "plat", "stretching", "barres_sol", "cavalettis",
  "meca_obstacles", "obstacles_enchainement", "cross_entrainement",
  "longe", "longues_renes", "travail_a_pied", "balade", "trotting",
  "galop", "marcheur", "concours", "autre",
]);

const EMPTY_RESULT = {
  type: null, duration_min: null, intensity: null,
  feeling: null, notes: null, rider: null, lieu: null, objectif: null,
};

export async function POST(request: NextRequest) {
  const { transcript } = await request.json();
  if (!transcript || typeof transcript !== "string") {
    return NextResponse.json({ error: "Missing transcript" }, { status: 400 });
  }

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: `Tu es un assistant d'extraction de données équestres.
Reçois un texte dicté et retourne UNIQUEMENT en JSON valide :
{
  "type": "dressage"|"plat"|"stretching"|"barres_sol"|"cavalettis"|"meca_obstacles"|"obstacles_enchainement"|"cross_entrainement"|"longe"|"longues_renes"|"travail_a_pied"|"balade"|"trotting"|"galop"|"marcheur"|"concours"|"autre"|null,
  "duration_min": number|null,
  "intensity": 1|2|3|4|5|null,
  "feeling": 1|2|3|4|5|null,
  "notes": string|null,
  "rider": "owner"|"owner_with_coach"|"coach"|"longe"|"travail_a_pied"|null,
  "lieu": string|null,
  "objectif": string|null
}

Règles :
- Si non mentionné = null. Ne jamais inventer une valeur.
- Variantes naturelles :
  barres/barres au sol → barres_sol
  cavallettis → cavalettis
  méca/méca obstacles → meca_obstacles
  CSO/obstacles en ligne → obstacles_enchainement
  CCE/cross/cross-country → cross_entrainement
  trot/sortie trot → trotting
  promenade/extérieur/balade → balade
  longe/à la longe → longe
  à pied/trav. à pied → travail_a_pied
- feeling : très bien/super/excellent → 5, bien → 4, neutre/ok/moyen → 3, tendu/crispé/difficile → 2, douleur/boite/très mauvais → 1
- rider : moi seule/seul/j'ai monté → owner, avec coach/moniteur/cours → owner_with_coach, coach seul/moniteur seul → coach`,
      messages: [{ role: "user", content: `Transcription vocale : "${transcript}"` }],
    });

    const content = response.content[0];
    if (content.type !== "text") return NextResponse.json(EMPTY_RESULT);

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json(EMPTY_RESULT);

    const parsed = JSON.parse(jsonMatch[0]);

    // Sanitise: invalid type → null (form will stay unselected)
    if (parsed.type && !VALID_TYPES.has(parsed.type)) parsed.type = null;
    // Clamp numeric fields
    if (parsed.intensity != null) parsed.intensity = Math.min(5, Math.max(1, Math.round(parsed.intensity)));
    if (parsed.feeling   != null) parsed.feeling   = Math.min(5, Math.max(1, Math.round(parsed.feeling)));
    if (parsed.duration_min != null) parsed.duration_min = Math.min(300, Math.max(1, Math.round(parsed.duration_min)));

    return NextResponse.json(parsed);
  } catch {
    // On any failure: return empty form data so the user can fill manually
    return NextResponse.json(EMPTY_RESULT);
  }
}
