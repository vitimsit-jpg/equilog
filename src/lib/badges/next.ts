import { BADGE_DEFS, type BadgeDef, type BadgeKey } from "@/lib/badges";

/**
 * Compteurs nécessaires au calcul du prochain badge.
 * Calculés côté serveur dans la page cheval.
 */
export interface BadgeProgress {
  totalSessions: number;
  totalCompetitions: number;
  competitionsThisSeason: number;
  rankedCompetitionsThisSeason: number;
  bestCompetitionRank: number | null;     // 1 = vainqueur, 2/3 = podium
  hasPodium: boolean;
  hasWinner: boolean;
  distinctSessionTypesThisMonth: number;
  horseIndexScore: number | null;
  isAmateurLevel: boolean;
  modulesFilled: number;                  // 0..4 (training, comp, health, nutrition)
  daysOwned: number;
}

/**
 * Pour chaque badge non obtenu, fournit (current, target).
 * Renvoie null si le badge n'a pas de critère numérique trackable.
 */
function badgeProgressRatio(key: BadgeKey, p: BadgeProgress): { current: number; target: number } | null {
  switch (key) {
    case "premier_pas":         return { current: Math.min(p.totalSessions, 1), target: 1 };
    case "premier_concours":    return { current: Math.min(p.totalCompetitions, 1), target: 1 };
    case "podium":              return p.hasPodium ? { current: 1, target: 1 } : { current: 0, target: 1 };
    case "vainqueur":           return p.hasWinner ? { current: 1, target: 1 } : { current: 0, target: 1 };
    case "premiere_saison":     return { current: Math.min(p.rankedCompetitionsThisSeason, 5), target: 5 };
    case "amateur":             return { current: p.isAmateurLevel ? 1 : 0, target: 1 };
    case "polyvalent":          return { current: Math.min(p.distinctSessionTypesThisMonth, 5), target: 5 };
    case "horse_index_80":      return { current: Math.min(p.horseIndexScore ?? 0, 80), target: 80 };
    case "duo_complet":         return { current: p.modulesFilled, target: 4 };
    case "un_an_ensemble":      return { current: Math.min(p.daysOwned, 365), target: 365 };
    case "trois_ans_ensemble":  return { current: Math.min(p.daysOwned, 1095), target: 1095 };
    case "cinq_ans_ensemble":   return { current: Math.min(p.daysOwned, 1825), target: 1825 };
    default:                    return null;
  }
}

/**
 * Retourne le badge non obtenu le plus proche d'être débloqué (ratio current/target le plus élevé).
 * Tie-break : ordre de déclaration de BADGE_DEFS.
 */
export function getNextBadge(
  earned: Set<string>,
  progress: BadgeProgress,
): { def: BadgeDef; current: number; target: number } | null {
  let best: { def: BadgeDef; current: number; target: number; ratio: number } | null = null;
  for (const def of BADGE_DEFS) {
    if (earned.has(def.key)) continue;
    const ratio = badgeProgressRatio(def.key as BadgeKey, progress);
    if (!ratio) continue;
    const r = ratio.current / ratio.target;
    if (!best || r > best.ratio) {
      best = { def, current: ratio.current, target: ratio.target, ratio: r };
    }
  }
  return best ? { def: best.def, current: best.current, target: best.target } : null;
}
