import type { StreakResult } from "./streaks";

export interface BadgeDef {
  key: string;
  emoji: string;
  label: string;
  description: string;
  category: "regularite" | "volume" | "concours" | "sante" | "special";
}

export const BADGE_DEFS: BadgeDef[] = [
  // Régularité (streaks)
  { key: "streak_2",  emoji: "🔥", label: "2 semaines",   description: "2 semaines consécutives d'entraînement",   category: "regularite" },
  { key: "streak_4",  emoji: "🔥", label: "1 mois",       description: "4 semaines consécutives d'entraînement",   category: "regularite" },
  { key: "streak_8",  emoji: "🔥", label: "2 mois",       description: "8 semaines consécutives d'entraînement",   category: "regularite" },
  { key: "streak_13", emoji: "🏅", label: "1 trimestre",  description: "13 semaines consécutives d'entraînement",  category: "regularite" },
  { key: "streak_26", emoji: "🏅", label: "6 mois",       description: "26 semaines consécutives d'entraînement",  category: "regularite" },
  { key: "streak_52", emoji: "🌟", label: "1 an de feu",  description: "52 semaines consécutives d'entraînement",  category: "regularite" },
  // Volume
  { key: "sessions_10",  emoji: "💪", label: "10 séances",   description: "10 séances enregistrées",  category: "volume" },
  { key: "sessions_50",  emoji: "💪", label: "50 séances",   description: "50 séances enregistrées",  category: "volume" },
  { key: "sessions_100", emoji: "💪", label: "100 séances",  description: "100 séances enregistrées", category: "volume" },
  { key: "sessions_200", emoji: "🏆", label: "200 séances",  description: "200 séances enregistrées", category: "volume" },
  { key: "sessions_500", emoji: "🌟", label: "500 séances",  description: "500 séances enregistrées", category: "volume" },
  // Concours
  { key: "first_competition",   emoji: "🎯", label: "Premier concours",   description: "Première compétition enregistrée",          category: "concours" },
  { key: "competitions_5",      emoji: "🏇", label: "5 concours",         description: "5 compétitions enregistrées",               category: "concours" },
  { key: "competitions_10",     emoji: "🏇", label: "10 concours",        description: "10 compétitions enregistrées",              category: "concours" },
  { key: "podium",              emoji: "🥇", label: "Podium",             description: "Top 3 dans une compétition",                category: "concours" },
  // Santé
  { key: "health_10",  emoji: "💊", label: "Suivi santé",  description: "10 soins enregistrés",   category: "sante" },
  { key: "health_50",  emoji: "🩺", label: "Pro santé",    description: "50 soins enregistrés",   category: "sante" },
  // Spéciaux
  { key: "first_session", emoji: "🌱", label: "Premier pas",   description: "Première séance enregistrée",  category: "special" },
  { key: "horse_index_active", emoji: "📊", label: "Horse Index",   description: "Horse Index activé",         category: "special" },
  { key: "variety_5",  emoji: "🎨", label: "Polyvalent",    description: "5 types de travail différents",    category: "special" },
];

export interface BadgeInput {
  totalSessions: number;
  totalCompetitions: number;
  totalHealthRecords: number;
  streak: StreakResult;
  hasPodium: boolean;
  hasHorseIndex: boolean;
  sessionTypes: string[];
}

/** Returns the list of badge_keys earned given the input data */
export function computeEarnedBadgeKeys(input: BadgeInput): string[] {
  const earned: string[] = [];
  const { totalSessions, totalCompetitions, totalHealthRecords, streak, hasPodium, hasHorseIndex, sessionTypes } = input;

  // Sessions
  if (totalSessions >= 1)   earned.push("first_session");
  if (totalSessions >= 10)  earned.push("sessions_10");
  if (totalSessions >= 50)  earned.push("sessions_50");
  if (totalSessions >= 100) earned.push("sessions_100");
  if (totalSessions >= 200) earned.push("sessions_200");
  if (totalSessions >= 500) earned.push("sessions_500");

  // Streak
  if (streak.best >= 2)  earned.push("streak_2");
  if (streak.best >= 4)  earned.push("streak_4");
  if (streak.best >= 8)  earned.push("streak_8");
  if (streak.best >= 13) earned.push("streak_13");
  if (streak.best >= 26) earned.push("streak_26");
  if (streak.best >= 52) earned.push("streak_52");

  // Competitions
  if (totalCompetitions >= 1)  earned.push("first_competition");
  if (totalCompetitions >= 5)  earned.push("competitions_5");
  if (totalCompetitions >= 10) earned.push("competitions_10");
  if (hasPodium) earned.push("podium");

  // Health
  if (totalHealthRecords >= 10) earned.push("health_10");
  if (totalHealthRecords >= 50) earned.push("health_50");

  // Special
  if (hasHorseIndex) earned.push("horse_index_active");
  const uniqueTypes = new Set(sessionTypes);
  if (uniqueTypes.size >= 5) earned.push("variety_5");

  return earned;
}

export function getBadgeDef(key: string): BadgeDef | undefined {
  return BADGE_DEFS.find((b) => b.key === key);
}
