import type { StreakResult } from "./streaks";

export interface BadgeDef {
  key: string;
  emoji: string;
  label: string;
  description: string;
  category: "regularite" | "concours" | "duree" | "defis" | "special";
}

// Famille 1 — Régularité & engagement (IC / IE uniquement)
// Famille 3 — Performance concours (IC uniquement, Compétiteur amateur / Pro)
// Famille 4 — Longue durée (tous modes)
// Famille 6 — Défis
// Spéciaux — divers
export const BADGE_DEFS: BadgeDef[] = [
  // ── Famille 1 — Régularité ──────────────────────────────────────────
  { key: "streak_4",  emoji: "🔥", label: "Première flamme", description: "4 semaines consécutives de streak actif",  category: "regularite" },
  { key: "streak_10", emoji: "🔥", label: "En feu",          description: "10 semaines consécutives de streak actif", category: "regularite" },
  { key: "streak_20", emoji: "💎", label: "Indestructible",  description: "20 semaines consécutives de streak actif", category: "regularite" },
  { key: "streak_52", emoji: "👑", label: "Légende",         description: "52 semaines consécutives — 1 an complet",  category: "regularite" },
  { key: "sessions_50",  emoji: "📓", label: "50 séances",  description: "50 séances loguées sur ce cheval",  category: "regularite" },
  { key: "sessions_100", emoji: "📓", label: "100 séances", description: "100 séances loguées sur ce cheval", category: "regularite" },
  { key: "sessions_500", emoji: "📓", label: "500 séances", description: "500 séances loguées sur ce cheval", category: "regularite" },
  // ── Famille 3 — Performance concours ───────────────────────────────
  { key: "first_competition", emoji: "⭐", label: "Premier concours", description: "1er concours logué sur ce cheval",               category: "concours" },
  { key: "podium",            emoji: "🏅", label: "Podium",           description: "Premier résultat top 3 logué sur ce cheval",      category: "concours" },
  { key: "winner",            emoji: "🏆", label: "Vainqueur",        description: "Première victoire (1ère place) sur ce cheval",    category: "concours" },
  { key: "first_season_5",    emoji: "🌿", label: "Première saison",  description: "5 concours sur ce cheval dans la même année",     category: "concours" },
  { key: "amateur",           emoji: "🔵", label: "Amateur",          description: "Premier concours en niveau Amateur sur ce cheval", category: "concours" },
  // ── Famille 4 — Longue durée ────────────────────────────────────────
  { key: "anniversary_1", emoji: "🎂",    label: "1 an ensemble",  description: "1 an depuis la création du profil cheval",  category: "duree" },
  { key: "anniversary_3", emoji: "🎂",    label: "3 ans ensemble", description: "3 ans depuis la création du profil cheval", category: "duree" },
  { key: "anniversary_5", emoji: "🎂",    label: "5 ans ensemble", description: "5 ans depuis la création du profil cheval", category: "duree" },
  { key: "duo_complet",   emoji: "🌟",    label: "Duo complet",    description: "Profil cheval 100% rempli (tous les champs)", category: "duree" },
  // ── Famille 6 — Défis ───────────────────────────────────────────────
  { key: "defi_complete", emoji: "🎯", label: "Défi complété",    description: "Objectif d'un défi atteint avant sa clôture", category: "defis" },
  // ── Spéciaux ────────────────────────────────────────────────────────
  { key: "first_session",      emoji: "🌱", label: "Premier pas",  description: "Première séance enregistrée", category: "special" },
  { key: "horse_index_active", emoji: "📊", label: "Horse Index",  description: "Horse Index activé",          category: "special" },
  { key: "variety_5",          emoji: "🎨", label: "Polyvalent",   description: "5 types de travail différents", category: "special" },
];

export interface BadgeInput {
  totalSessions: number;
  totalCompetitions: number;
  totalHealthRecords: number;
  streak: StreakResult;
  hasPodium: boolean;
  hasWinner: boolean;
  hasHorseIndex: boolean;
  sessionTypes: string[];
  // Famille 3
  hasAmateurLevel: boolean;
  maxSameYearCompetitions: number;
  // Famille 4
  horseCreatedAt: string | null;
  isCompleteProfile: boolean;
}

/** Returns the list of badge_keys earned given the input data */
export function computeEarnedBadgeKeys(input: BadgeInput): string[] {
  const earned: string[] = [];
  const {
    totalSessions, totalCompetitions, totalHealthRecords, streak,
    hasPodium, hasWinner, hasHorseIndex, sessionTypes,
    hasAmateurLevel, maxSameYearCompetitions,
    horseCreatedAt, isCompleteProfile,
  } = input;

  // Famille 1 — Régularité
  if (totalSessions >= 1)   earned.push("first_session");
  if (totalSessions >= 50)  earned.push("sessions_50");
  if (totalSessions >= 100) earned.push("sessions_100");
  if (totalSessions >= 500) earned.push("sessions_500");

  if (streak.best >= 4)  earned.push("streak_4");
  if (streak.best >= 10) earned.push("streak_10");
  if (streak.best >= 20) earned.push("streak_20");
  if (streak.best >= 52) earned.push("streak_52");

  // Famille 3 — Concours
  if (totalCompetitions >= 1)    earned.push("first_competition");
  if (hasPodium)                 earned.push("podium");
  if (hasWinner)                 earned.push("winner");
  if (maxSameYearCompetitions >= 5) earned.push("first_season_5");
  if (hasAmateurLevel)           earned.push("amateur");

  // Famille 4 — Longue durée
  if (horseCreatedAt) {
    const yearsOld = (Date.now() - new Date(horseCreatedAt).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (yearsOld >= 1) earned.push("anniversary_1");
    if (yearsOld >= 3) earned.push("anniversary_3");
    if (yearsOld >= 5) earned.push("anniversary_5");
  }
  if (isCompleteProfile && totalSessions >= 1 && totalHealthRecords >= 1) earned.push("duo_complet");

  // Spéciaux
  if (hasHorseIndex) earned.push("horse_index_active");
  const uniqueTypes = new Set(sessionTypes);
  if (uniqueTypes.size >= 5) earned.push("variety_5");

  return earned;
}

export function getBadgeDef(key: string): BadgeDef | undefined {
  return BADGE_DEFS.find((b) => b.key === key);
}
