export type Plan = "starter" | "pro" | "ecurie";

export const PLAN_LIMITS: Record<Plan, {
  maxHorses: number;
  hasAI: boolean;
  hasHorseIndex: boolean;
  hasCommunity: boolean;
  hasEcurie: boolean;
}> = {
  starter: { maxHorses: 1, hasAI: false, hasHorseIndex: false, hasCommunity: false, hasEcurie: false },
  pro:     { maxHorses: Infinity, hasAI: true,  hasHorseIndex: true,  hasCommunity: true,  hasEcurie: false },
  ecurie:  { maxHorses: Infinity, hasAI: true,  hasHorseIndex: true,  hasCommunity: true,  hasEcurie: true  },
};

export function canAddHorse(plan: Plan, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[plan].maxHorses;
}

export function hasFeature(plan: Plan, feature: keyof typeof PLAN_LIMITS[Plan]): boolean {
  return !!(PLAN_LIMITS[plan] as Record<string, unknown>)[feature];
}
