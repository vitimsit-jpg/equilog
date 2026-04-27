import type { SupabaseClient } from "@supabase/supabase-js";
import type { BadgeKey } from "@/lib/badges";

/**
 * Persiste un badge en base. Idempotent grâce à UNIQUE(horse_id, badge_key) — ré-appeler n'a aucun effet.
 * Silencieux : pas de toast ni d'exception. Les triggers décident en amont si la condition est remplie.
 * Règle absolue : un badge obtenu n'est JAMAIS retiré (on n'expose pas de fonction inverse).
 */
export async function checkAndAwardBadge(
  supabase: SupabaseClient,
  horseId: string,
  userId: string,
  badgeKey: BadgeKey,
): Promise<void> {
  const { error } = await supabase
    .from("horse_badges")
    .upsert(
      { horse_id: horseId, user_id: userId, badge_key: badgeKey },
      { onConflict: "horse_id,badge_key", ignoreDuplicates: true },
    );
  if (error) {
    console.error("[checkAndAwardBadge]", badgeKey, error);
  }
}

/**
 * Vérifie qu'un cheval a au moins une entrée dans les 4 modules : Travail, Concours, Soins, Nutrition.
 * Sert au déclencheur du badge `duo_complet`.
 */
export async function hasAllFourModules(
  supabase: SupabaseClient,
  horseId: string,
): Promise<boolean> {
  const tables = [
    "training_sessions",
    "competitions",
    "health_records",
    "horse_nutrition",
  ] as const;

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("horse_id", horseId);
    if (error || !count || count === 0) return false;
  }
  return true;
}

/**
 * Award `duo_complet` si les 4 modules sont renseignés. À appeler après chaque INSERT
 * dans training/competitions/health/nutrition.
 */
export async function awardDuoCompletIfReady(
  supabase: SupabaseClient,
  horseId: string,
  userId: string,
): Promise<void> {
  if (await hasAllFourModules(supabase, horseId)) {
    await checkAndAwardBadge(supabase, horseId, userId, "duo_complet");
  }
}
