import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const client = new Anthropic();

const SYSTEM_PROMPT = `Tu es un assistant vétérinaire expert qui analyse des documents médicaux équins (ordonnances, comptes-rendus, résultats d'analyses, bilans vétérinaires).

Extrais tous les événements médicaux du document. Pour chaque événement, retourne un JSON avec :
- category: une de ces valeurs exactes: boiterie, ulcere, colique, operation, vaccination, bilan_sanguin, soins_dentaires, osteo, radio, physio, traitement_long_terme, autre
- title: titre court de l'événement (max 60 caractères)
- description: description détaillée des symptômes, traitements, résultats
- date_precision: "exact" | "mois" | "annee" | "inconnue"
- event_date: si date_precision="exact", format "YYYY-MM-DD"
- event_month: si date_precision="mois", entier 1-12
- event_year: si date_precision="mois" ou "annee", entier
- vet_name: nom du vétérinaire si mentionné
- clinic: nom de la clinique/cabinet si mentionné
- outcome: "gueri" | "chronique" | "suivi" | "inconnu"
- severity: "leger" | "modere" | "severe"
- confidence: objet avec confiance 0-1 pour chaque champ extrait ex: {"category": 0.9, "title": 0.85, "event_date": 0.7}

Retourne UNIQUEMENT un JSON valide de cette forme:
{"events": [...]}

Si le document n'est pas lisible ou ne contient pas d'information médicale, retourne: {"events": []}`;

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const horseId = formData.get("horseId") as string | null;

    if (!file || !horseId) {
      return NextResponse.json({ error: "Missing file or horseId" }, { status: 400 });
    }

    // Verify horse ownership
    const adminClient = createAdminClient();
    const { data: horse } = await adminClient
      .from("horses")
      .select("id")
      .eq("id", horseId)
      .eq("user_id", user.id)
      .single();

    if (!horse) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const mediaType = file.type as "application/pdf" | "image/jpeg" | "image/png" | "image/webp";

    // Build the content block based on file type
    const contentBlock = mediaType === "application/pdf"
      ? {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: base64,
          },
        }
      : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: mediaType,
            data: base64,
          },
        };

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            contentBlock,
            {
              type: "text",
              text: "Analyse ce document médical vétérinaire et extrais tous les événements médicaux.",
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ events: [] });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("History extract error:", err);
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}
