export type Plan = "starter" | "pro" | "ecurie";

export const PLAN_LIMITS: Record<Plan, {
  maxHorses: number;
  hasAI: boolean;
  hasHorseIndex: boolean;
  hasCommunity: boolean;
  hasEcurie: boolean;
  hasPDF: boolean;
  hasShare: boolean;
  hasAllModules: boolean;
}> = {
  starter: { maxHorses: 1,        hasAI: false, hasHorseIndex: false, hasCommunity: true,  hasEcurie: false, hasPDF: false, hasShare: false, hasAllModules: false },
  pro:     { maxHorses: Infinity,  hasAI: true,  hasHorseIndex: true,  hasCommunity: true,  hasEcurie: false, hasPDF: true,  hasShare: true,  hasAllModules: true  },
  ecurie:  { maxHorses: Infinity,  hasAI: true,  hasHorseIndex: true,  hasCommunity: true,  hasEcurie: true,  hasPDF: true,  hasShare: true,  hasAllModules: true  },
};

export function canAddHorse(plan: Plan, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[plan].maxHorses;
}

export function hasFeature(plan: Plan, feature: keyof typeof PLAN_LIMITS[Plan]): boolean {
  return !!(PLAN_LIMITS[plan] as Record<string, unknown>)[feature];
}
