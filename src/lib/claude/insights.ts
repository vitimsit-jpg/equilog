import Anthropic from "@anthropic-ai/sdk";
import type {
  Horse,
  TrainingSession,
  HealthRecord,
  Competition,
  HorseScore,
} from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils";

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

interface InsightData {
  horse: Horse;
  trainingSessions: TrainingSession[];
  healthRecords: HealthRecord[];
  competitions: Competition[];
  currentScore: HorseScore | null;
  userType?: string | null;
  riderNiveau?: string | null;
  riderObjectif?: string | null;
  riderFrequence?: number | null;
  riderDisciplines?: string[] | null;
  // Advanced — only injected when module_coach = true
  moduleCoach?: boolean;
  riderZones?: string[] | null;
  riderAsymetrie?: string | null;
  riderPathologies?: string | null;
  riderSuiviCorps?: Record<string, { actif: boolean; frequence?: string }> | null;
}

const PROFILE_INSTRUCTIONS: Record<string, string> = {
  loisir: `L'utilisateur est un cavalier loisir. Adopte un ton chaleureux, encourageant et rassurant.
Mets en avant le bien-être du cheval et les petites victoires du quotidien.
Évite le jargon technique, préfère des formulations simples.
Focus prioritaire : santé, régularité, plaisir de monter.`,

  competition: `L'utilisateur est un cavalier compétiteur amateur. Adopte un ton analytique et orienté performance.
Mets en avant les données chiffrées, les tendances de progression et les résultats concours.
Sois précis sur les axes d'amélioration technique et la préparation aux prochaines épreuves.
Focus prioritaire : progression, préparation concours, optimisation de la charge d'entraînement.`,

  pro: `L'utilisateur est un cavalier professionnel ou haut niveau. Adopte un ton expert et synthétique.
Va droit au but, utilise le vocabulaire technique sans le définir.
Met en avant les indicateurs de performance avancés et les signaux faibles à surveiller.
Focus prioritaire : optimisation de la performance, gestion de la charge, prévention des blessures.`,

  gerant: `L'utilisateur gère une structure équestre. Adopte un ton professionnel et efficace.
Focus sur la santé, les soins et la gestion — pas de recommandations de performance sportive.
Identifie les risques sanitaires à anticiper et les rappels de soins à planifier.
Focus prioritaire : alertes santé, soins à programmer, état général du cheval.`,

  // Legacy fallbacks (kept for backward compat with existing user_type values)
  gerant_cavalier: `L'utilisateur est gérant d'écurie et cavalier. Adopte un ton professionnel et structuré.
Équilibre les recommandations entre gestion (santé, soins programmés) et performance personnelle.
Sois synthétique car son temps est limité.
Focus prioritaire : anticipation des soins, efficacité des séances, gestion du calendrier.`,

  coach: `L'utilisateur est un coach indépendant. Adopte un ton pédagogique et observateur.
Analyse la progression du cheval dans une logique d'enseignement — quels exercices seraient bénéfiques, quels patterns observer.
Met en avant ce qui peut informer les prochaines séances de coaching.
Focus prioritaire : progression technique, points à travailler, cohérence du programme.`,

  gerant_ecurie: `L'utilisateur est gérant d'écurie (sans chevaux propres). Adopte un ton professionnel et efficace.
Focus exclusif sur la santé, les soins et la gestion — pas de recommandations de performance sportive.
Identifie les risques sanitaires à anticiper et les rappels de soins à planifier.
Focus prioritaire : alertes santé, soins à programmer, état général du cheval.`,
};

const BASE_SYSTEM_PROMPT = `Tu es Equistra AI, un assistant expert en performance et santé équine.
Tu analyses les données croisées d'un cheval (entraînement, santé, concours, wearables) pour fournir des insights actionnables.

Règles de réponse :
- Sois direct et précis, pas de formules vagues
- Utilise des données chiffrées quand disponibles
- Détecte les anomalies : surmenage, stagnation, régression, soins en retard
- Valorise les progressions et bons résultats
- Recommande des actions concrètes (ex: "Réduire l'intensité de 20% cette semaine" ou "Prévoir vermifuge dans 2 semaines")
- Format : JSON avec les champs "summary" (2-3 phrases), "insights" (array de 3-5 points), "alerts" (array d'alertes urgentes), "recommendations" (array d'actions à faire)
- Réponse en français uniquement`;

function buildSystemPrompt(userType?: string | null): string {
  const profileInstructions = userType && PROFILE_INSTRUCTIONS[userType]
    ? `\n\n## Adaptation au profil utilisateur\n${PROFILE_INSTRUCTIONS[userType]}`
    : "";
  return BASE_SYSTEM_PROMPT + profileInstructions;
}

export async function generateWeeklyInsight(data: InsightData): Promise<{
  summary: string;
  insights: string[];
  alerts: string[];
  recommendations: string[];
}> {
  const { horse, trainingSessions, healthRecords, competitions, currentScore, userType, riderNiveau, riderObjectif, riderFrequence, riderDisciplines, moduleCoach, riderZones, riderAsymetrie, riderPathologies, riderSuiviCorps } = data;

  const riderBasicLines = [
    riderNiveau && `Niveau : ${riderNiveau}`,
    riderObjectif && `Objectif : ${riderObjectif}`,
    riderFrequence && `Fréquence : ${riderFrequence}×/semaine`,
    riderDisciplines?.length && `Disciplines : ${riderDisciplines.join(", ")}`,
  ].filter(Boolean).join(" | ");

  const riderAdvancedLines = moduleCoach ? [
    riderZones?.length && `Zones douloureuses : ${riderZones.join(", ")}`,
    riderAsymetrie && `Asymétrie : ${riderAsymetrie}`,
    riderPathologies && `Pathologies : ${riderPathologies}`,
    riderSuiviCorps && Object.keys(riderSuiviCorps).length > 0 &&
      `Suivi corps : ${Object.entries(riderSuiviCorps)
        .filter(([, v]) => v.actif)
        .map(([k, v]) => `${k}${v.frequence ? ` (${v.frequence})` : ""}`)
        .join(", ")}`,
  ].filter(Boolean).join("\n") : null;

  const riderContext = (riderBasicLines || riderAdvancedLines)
    ? `${riderBasicLines}${riderAdvancedLines ? `\n${riderAdvancedLines}` : ""}`
    : null;

  const last30Sessions = trainingSessions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30);

  const recentHealth = healthRecords
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const recentComps = competitions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const userMessage = `
Analyse le cheval suivant et génère un rapport hebdomadaire :

## Profil cavalier${moduleCoach ? " (Coach activé)" : ""}
${riderContext || "Non renseigné"}

## Informations cheval
Nom: ${horse.name}
Race: ${horse.breed || "Non renseignée"}
Discipline: ${horse.discipline || "Non renseignée"}
Année de naissance: ${horse.birth_year || "Non renseignée"}

## Horse Index actuel
Score global: ${currentScore?.score ?? "Non calculé"}/100
- Régularité: ${currentScore?.score_breakdown?.regularite ?? "N/A"}/25
- Progression: ${currentScore?.score_breakdown?.progression ?? "N/A"}/25
- Santé: ${currentScore?.score_breakdown?.sante ?? "N/A"}/20
- Récupération: ${currentScore?.score_breakdown?.recuperation ?? "N/A"}/20

## Séances des 30 derniers jours (${last30Sessions.length} séances)
${last30Sessions.map((s) => `- ${formatDate(s.date)}: ${s.type}, ${s.duration_min}min, intensité ${s.intensity}/5, ressenti ${s.feeling}/5${s.notes ? `, note: ${s.notes}` : ""}`).join("\n")}

## Soins récents
${recentHealth.map((h) => `- ${formatDate(h.date)}: ${h.type}${h.next_date ? `, prochain: ${formatDate(h.next_date)}` : ""}${h.notes ? `, note: ${h.notes}` : ""}`).join("\n")}

## Concours récents
${recentComps.map((c) => `- ${formatDate(c.date)}: ${c.event_name} (${c.discipline} ${c.level})${c.result_rank && c.total_riders ? `, classé ${c.result_rank}/${c.total_riders}` : ""}${c.score ? `, score: ${c.score}` : ""}`).join("\n") || "Aucun concours récent"}

Génère un rapport JSON selon le format demandé.`;

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: buildSystemPrompt(userType),
    messages: [{ role: "user", content: userMessage }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {
      summary: content.text.substring(0, 200),
      insights: ["Analyse en cours..."],
      alerts: [],
      recommendations: ["Consultez les données détaillées"],
    };
  }
}

export interface TrainingPlanDay {
  day: string;
  type: string | null;
  duration_min: number | null;
  intensity: number | null;
  focus: string;
  optional: boolean;
}

export interface TrainingPlan {
  week_goal: string;
  load_level: "light" | "moderate" | "intense";
  days: TrainingPlanDay[];
  notes: string;
}

export async function generateTrainingPlan(data: {
  horse: Horse;
  recentSessions: TrainingSession[];
  upcomingCompetitions: Competition[];
  currentScore: HorseScore | null;
  healthRecords: HealthRecord[];
}): Promise<TrainingPlan> {
  const { horse, recentSessions, upcomingCompetitions, currentScore, healthRecords } = data;

  const last4Weeks = recentSessions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 28);

  const nextComps = upcomingCompetitions
    .filter((c) => new Date(c.date) > new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 2);

  const recentHealth = healthRecords
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const prompt = `Génère un plan d'entraînement hebdomadaire pour ce cheval.

## Cheval
Nom: ${horse.name}
Race: ${horse.breed || "Non renseignée"}
Discipline: ${horse.discipline || "Non renseignée"}
Âge: ${horse.birth_year ? new Date().getFullYear() - horse.birth_year : "Inconnu"} ans

## Horse Index actuel: ${currentScore?.score ?? "Non calculé"}/100

## Séances récentes (${last4Weeks.length} séances sur 4 semaines)
${last4Weeks.map((s) => `- ${formatDate(s.date)}: ${s.type}, ${s.duration_min}min, intensité ${s.intensity}/5, ressenti ${s.feeling}/5`).join("\n") || "Aucune séance enregistrée"}

## Soins récents
${recentHealth.map((h) => `- ${formatDate(h.date)}: ${h.type}${h.next_date ? `, prochain: ${formatDate(h.next_date)}` : ""}`).join("\n") || "Aucun soin récent"}

## Concours à venir
${nextComps.map((c) => `- ${formatDate(c.date)}: ${c.event_name} (${c.discipline} ${c.level})`).join("\n") || "Aucun concours planifié"}

Génère un JSON avec exactement 7 jours (Lundi à Dimanche) selon ce format:
{
  "week_goal": "objectif principal de la semaine",
  "load_level": "light" | "moderate" | "intense",
  "days": [
    { "day": "Lundi", "type": "dressage" | "saut" | "endurance" | "cso" | "cross" | "travail_a_pied" | "longe" | "galop" | "plat" | "autre" | null, "duration_min": 45 | null, "intensity": 3 | null, "focus": "description courte du travail", "optional": false }
  ],
  "notes": "conseils et observations"
}
Adapte la charge aux concours à venir, à la fatigue récente (ressenti moyen des séances), et aux soins récents. Prévois au moins 2 jours de repos. Réponds uniquement en JSON.`;

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: `Tu es Equistra AI, coach équestre expert. Tu génères des plans d'entraînement personnalisés basés sur les données réelles du cheval. Réponse en JSON pur uniquement, sans markdown.`,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {
      week_goal: "Maintenir la régularité cette semaine",
      load_level: "moderate",
      days: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"].map((day, i) => ({
        day,
        type: i === 1 || i === 4 ? null : "plat",
        duration_min: i === 1 || i === 4 ? null : 45,
        intensity: i === 1 || i === 4 ? null : 3,
        focus: i === 1 || i === 4 ? "Repos" : "Séance d'entretien",
        optional: false,
      })),
      notes: "Plan générique — ajoutez des séances pour obtenir des recommandations personnalisées.",
    };
  }
}

export async function generateCompetitionChecklist(data: {
  horse: Horse;
  competition: Competition;
  healthRecords: HealthRecord[];
}): Promise<{ ok: boolean; item: string; status: string }[]> {
  const { horse, competition, healthRecords } = data;

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    system: `Tu es un assistant équestre expert. Génère une checklist J-7 avant concours en JSON.
Format: array d'objets {ok: boolean, item: string, status: string}.
Vérifie les vaccins FEI (grippe: validité 6 mois + 21 jours minimum depuis dernière injection, rappel annuel).
Réponse en JSON pur, sans markdown.`,
    messages: [
      {
        role: "user",
        content: `Cheval: ${horse.name}, Concours: ${competition.event_name} le ${formatDate(competition.date)} (${competition.discipline} ${competition.level})

Soins récents: ${healthRecords
          .map(
            (h) =>
              `${h.type}: ${formatDate(h.date)}${h.next_date ? ` (prochain: ${formatDate(h.next_date)})` : ""}`
          )
          .join(", ")}

Génère la checklist.`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") return [];

  try {
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    return JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }
}
