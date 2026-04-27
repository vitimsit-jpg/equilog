/**
 * Refonte badges Agathe avril 2026 — Direction C "Minimal Sport"
 * 12 badges scopés par cheval, 3 familles : Concours (5), Longue Durée (4), Spéciaux (3)
 *
 * Anciens slugs conservés pour rétrocompat DB :
 *   first_competition (=premier_concours), winner (=vainqueur), first_season_5 (=premiere_saison),
 *   anniversary_1/3/5 (=un_an/trois_ans/cinq_ans_ensemble), first_session (=premier_pas),
 *   horse_index_active (=horse_index_80), variety_5 (=polyvalent)
 *
 * Streak/sessions_50/100/500/defi_complete : SUPPRIMÉS du catalogue mais conservés en DB
 * (un badge obtenu n'est jamais retiré — règle absolue).
 */

export type BadgeFamily = "concours" | "duree" | "special";

export interface BadgeDef {
  key: string;
  emoji: string;
  label: string;
  description: string;     // critère affiché à l'expand
  howTo: string;           // "Comment l'obtenir" pour les non obtenus
  family: BadgeFamily;
  familyLabel: string;     // tag affiché : "Concours", "Longue durée", "Spécial"
}

export const BADGE_DEFS: BadgeDef[] = [
  // ── Famille 1 — Concours (5) ──────────────────────────────────────────
  {
    key: "premier_concours",
    emoji: "⭐",
    label: "Premier concours",
    description: "Première participation officielle",
    howTo: "Enregistrez votre premier concours dans le module Concours.",
    family: "concours",
    familyLabel: "Concours",
  },
  {
    key: "podium",
    emoji: "🏅",
    label: "Podium",
    description: "Top 3 en concours classé",
    howTo: "Terminez dans le top 3 d'un concours classé, toute discipline confondue.",
    family: "concours",
    familyLabel: "Concours",
  },
  {
    key: "vainqueur",
    emoji: "🏆",
    label: "Vainqueur",
    description: "1ère place en concours classé",
    howTo: "Remportez la 1ère place lors d'un concours classé, toute discipline confondue.",
    family: "concours",
    familyLabel: "Concours",
  },
  {
    key: "premiere_saison",
    emoji: "🌿",
    label: "Première saison",
    description: "5 concours sur une saison",
    howTo: "Disputez 5 concours classés sur une même saison sportive (1er sept. → 31 août).",
    family: "concours",
    familyLabel: "Concours",
  },
  {
    key: "amateur",
    emoji: "🔵",
    label: "Amateur",
    description: "Concours classé niveau Amateur ou supérieur",
    howTo: "Disputez un concours en niveau Amateur, Pro, Elite ou international (CCI*, CDI*, CSI*).",
    family: "concours",
    familyLabel: "Concours",
  },

  // ── Famille 2 — Longue Durée (4) ──────────────────────────────────────
  {
    key: "un_an_ensemble",
    emoji: "🗓️",
    label: "1 an ensemble",
    description: "365 jours d'activité continue",
    howTo: "Maintenez au moins une activité (séance ou soin) par mois pendant 1 an.",
    family: "duree",
    familyLabel: "Longue durée",
  },
  {
    key: "trois_ans_ensemble",
    emoji: "📅",
    label: "3 ans ensemble",
    description: "1095 jours d'activité continue",
    howTo: "Continuez à utiliser Equistra avec ce cheval pendant 3 ans.",
    family: "duree",
    familyLabel: "Longue durée",
  },
  {
    key: "cinq_ans_ensemble",
    emoji: "🌟",
    label: "5 ans ensemble",
    description: "1825 jours d'activité continue",
    howTo: "Continuez à utiliser Equistra avec ce cheval pendant 5 ans.",
    family: "duree",
    familyLabel: "Longue durée",
  },
  {
    key: "duo_complet",
    emoji: "⭐",
    label: "Duo complet",
    description: "Tous les modules renseignés",
    howTo: "Renseignez au moins une entrée dans Soins, Travail, Nutrition et Concours.",
    family: "duree",
    familyLabel: "Longue durée",
  },

  // ── Famille 3 — Spéciaux (3) ──────────────────────────────────────────
  {
    key: "premier_pas",
    emoji: "🌱",
    label: "Premier pas",
    description: "Première séance enregistrée",
    howTo: "Enregistrez votre première séance de travail.",
    family: "special",
    familyLabel: "Spécial",
  },
  {
    key: "horse_index_80",
    emoji: "📊",
    label: "Horse Index 80",
    description: "Score Horse Index ≥ 80",
    howTo: "Atteignez un score Horse Index supérieur ou égal à 80.",
    family: "special",
    familyLabel: "Spécial",
  },
  {
    key: "polyvalent",
    emoji: "🎨",
    label: "Polyvalent",
    description: "5 types de travail différents en un mois",
    howTo: "Enregistrez 5 types de travail différents au cours d'un même mois calendaire.",
    family: "special",
    familyLabel: "Spécial",
  },
];

export type BadgeKey = typeof BADGE_DEFS[number]["key"];

export function getBadgeDef(key: string): BadgeDef | undefined {
  return BADGE_DEFS.find((b) => b.key === key);
}

export const BADGE_FAMILIES: { key: BadgeFamily; label: string }[] = [
  { key: "concours", label: "Concours" },
  { key: "duree",    label: "Longue durée" },
  { key: "special",  label: "Spéciaux" },
];

// ─── Logique helpers ───────────────────────────────────────────────────────

/** Saison sportive : 1er sept N → 31 août N+1 */
export function getSportSeasonStart(date: Date): Date {
  const month = date.getMonth(); // 0=jan
  const year = date.getFullYear();
  // Si on est avant septembre, la saison a commencé en sept. de l'année précédente
  return month >= 8 ? new Date(year, 8, 1) : new Date(year - 1, 8, 1);
}

/**
 * Vérifie si un `level` de concours correspond au critère du badge `amateur` :
 * niveau Amateur+ (Amateur, Pro, Elite) ou international (CCI/CDI/CSI).
 * Source unique : utilisé par `awardCompetitionBadges` ET le calcul `BadgeProgress` côté page cheval.
 */
export function isAmateurLevel(level: string | null | undefined): boolean {
  if (!level) return false;
  const n = level.toLowerCase();
  return (
    n.includes("amateur") ||
    n.includes("pro") ||
    n.includes("elite") ||
    /\b(cci|cdi|csi)/i.test(n)
  );
}
