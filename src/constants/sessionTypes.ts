/**
 * TRAV-26 §4 — SOURCE UNIQUE DE VÉRITÉ pour les types de séance
 * Toutes les icônes, labels, couleurs et abréviations de types de séance
 * doivent être importées depuis ce fichier.
 * Modifier ici = propagation automatique partout dans l'app.
 */

export interface SessionTypeConfig {
  key: string;
  emoji: string;
  label: string;
  abbreviation: string;
  color: string;
  maxDurationMinutes: number;
}

// ── Mapping complet officiel (validé par Agathe le 16/04/2026) ──────────────

// Bug #7 Agathe — emojis alignés sur TRAV-17 (mapping officiel)
export const SESSION_TYPE_CONFIG: Record<string, SessionTypeConfig> = {
  dressage:               { key: "dressage",               emoji: "🎩", label: "Dressage",             abbreviation: "DRESS", color: "#3D85C8", maxDurationMinutes: 240 },
  plat:                   { key: "plat",                   emoji: "🏇", label: "Plat",                 abbreviation: "PLAT",  color: "#3D85C8", maxDurationMinutes: 240 },
  stretching:             { key: "stretching",             emoji: "🤸", label: "Stretching & récup",   abbreviation: "STRCH", color: "#8E7CC3", maxDurationMinutes: 120 },
  barres_sol:             { key: "barres_sol",             emoji: "➖", label: "Barres au sol",         abbreviation: "BS",    color: "#8E7CC3", maxDurationMinutes: 240 },
  cavalettis:             { key: "cavalettis",             emoji: "🪵", label: "Cavalettis",            abbreviation: "CAV",   color: "#8E7CC3", maxDurationMinutes: 240 },
  meca_obstacles:         { key: "meca_obstacles",         emoji: "🧱", label: "Méca obstacles",        abbreviation: "MECA",  color: "#E69138", maxDurationMinutes: 240 },
  obstacles_enchainement: { key: "obstacles_enchainement", emoji: "🔁", label: "Obstacles enchaînés",   abbreviation: "OBS",   color: "#E69138", maxDurationMinutes: 240 },
  cross_entrainement:     { key: "cross_entrainement",     emoji: "🌿", label: "Cross entraînement",    abbreviation: "CROSS", color: "#9C4A7A", maxDurationMinutes: 240 },
  longe:                  { key: "longe",                  emoji: "⭕", label: "Longe",                 abbreviation: "LONGE", color: "#45818E", maxDurationMinutes: 120 },
  longues_renes:          { key: "longues_renes",          emoji: "🧵", label: "Longues rênes",         abbreviation: "LR",    color: "#45818E", maxDurationMinutes: 120 },
  travail_a_pied:         { key: "travail_a_pied",         emoji: "🤝", label: "Travail à pied",        abbreviation: "TAP",   color: "#45818E", maxDurationMinutes: 120 },
  balade:                 { key: "balade",                 emoji: "🌲", label: "Balade",                abbreviation: "BAL",   color: "#45818E", maxDurationMinutes: 480 },
  trotting:               { key: "trotting",               emoji: "📏", label: "Trotting poles",        abbreviation: "TROTT", color: "#45818E", maxDurationMinutes: 240 },
  galop:                  { key: "galop",                  emoji: "💨", label: "Galop",                 abbreviation: "GALOP", color: "#4CAF50", maxDurationMinutes: 240 },
  marcheur:               { key: "marcheur",               emoji: "🔄", label: "Marcheur",              abbreviation: "MARCH", color: "#888888", maxDurationMinutes: 180 },
  paddock:                { key: "paddock",                emoji: "🟩", label: "Paddock",               abbreviation: "PADD",  color: "#4CAF50", maxDurationMinutes: 480 },
  concours:               { key: "concours",               emoji: "🏆", label: "Concours",              abbreviation: "CONC",  color: "#D94F00", maxDurationMinutes: 720 },
  repos:                  { key: "repos",                  emoji: "💤", label: "Repos",                 abbreviation: "REPOS", color: "#888888", maxDurationMinutes: 1440 },
  autre:                  { key: "autre",                  emoji: "📝", label: "Autre",                  abbreviation: "AUTRE", color: "#888888", maxDurationMinutes: 240 },
};

// ── Extractions individuelles (pour rétro-compatibilité) ────────────────────

/** Emoji par type de séance — clé → emoji */
export const SESSION_TYPE_EMOJIS: Record<string, string> = Object.fromEntries(
  Object.entries(SESSION_TYPE_CONFIG).map(([k, v]) => [k, v.emoji])
);

/** Label par type de séance — clé → label */
export const SESSION_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(SESSION_TYPE_CONFIG).map(([k, v]) => [k, v.label])
);

/** Couleur par type de séance — clé → hex color */
export const SESSION_TYPE_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(SESSION_TYPE_CONFIG).map(([k, v]) => [k, v.color])
);

// ── Legacy keys (pour les données existantes en DB) ─────────────────────────

const LEGACY_EMOJIS: Record<string, string> = {
  saut: "🏇",
  endurance: "🏅",
  cso: "🔁",
  cross: "🌿",
};

const LEGACY_LABELS: Record<string, string> = {
  saut: "Saut d'obstacles",
  endurance: "Endurance",
  cso: "CSO",
  cross: "Cross",
};

// ── Fonctions helpers ───────────────────────────────────────────────────────

/** Retourne l'emoji pour un type donné (inclut les legacy keys) */
export function getSessionEmoji(type: string): string {
  return SESSION_TYPE_EMOJIS[type] ?? LEGACY_EMOJIS[type] ?? "✳️";
}

/** Retourne le label pour un type donné (inclut les legacy keys) */
export function getSessionLabel(type: string): string {
  return SESSION_TYPE_LABELS[type] ?? LEGACY_LABELS[type] ?? type;
}

/** Retourne la couleur pour un type donné */
export function getSessionColor(type: string): string {
  return SESSION_TYPE_COLORS[type] ?? "#888888";
}

/** Liste des items pour le formulaire (grille de sélection) */
export const DISCIPLINE_GRID_ITEMS = Object.values(SESSION_TYPE_CONFIG)
  .filter((c) => c.key !== "marcheur" && c.key !== "paddock")
  .map((c) => ({ type: c.key, emoji: c.emoji, label: c.label }));
