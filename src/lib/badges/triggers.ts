import type { SupabaseClient } from "@supabase/supabase-js";
import { checkAndAwardBadge, awardDuoCompletIfReady } from "./award";
import { getSportSeasonStart, isAmateurLevel } from "@/lib/badges";

/**
 * Récupère l'user_id du cheval (utilisé quand l'auth n'est pas dispo côté composant client).
 */
async function getHorseOwnerId(supabase: SupabaseClient, horseId: string): Promise<string | null> {
  const { data } = await supabase.from("horses").select("user_id").eq("id", horseId).single();
  return (data?.user_id as string | undefined) ?? null;
}

/**
 * Triggers déclenchés après l'INSERT d'une séance de travail.
 * Couvre : premier_pas, polyvalent, duo_complet.
 */
export async function awardTrainingBadges(supabase: SupabaseClient, horseId: string): Promise<void> {
  const userId = await getHorseOwnerId(supabase, horseId);
  if (!userId) return;

  const { data: sessions } = await supabase
    .from("training_sessions")
    .select("date, type")
    .eq("horse_id", horseId)
    .is("deleted_at", null);
  if (!sessions) return;

  // premier_pas : ≥1 séance
  if (sessions.length >= 1) {
    await checkAndAwardBadge(supabase, horseId, userId, "premier_pas");
  }

  // polyvalent : ≥5 types distincts dans le mois calendaire courant
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const types = new Set(
    sessions
      .filter((s: any) => s.date && new Date(s.date) >= monthStart)
      .map((s: any) => s.type)
      .filter(Boolean),
  );
  if (types.size >= 5) {
    await checkAndAwardBadge(supabase, horseId, userId, "polyvalent");
  }

  await awardDuoCompletIfReady(supabase, horseId, userId);
}

/**
 * Triggers déclenchés après l'INSERT/UPDATE d'un concours.
 * Couvre : premier_concours, podium, vainqueur, premiere_saison, duo_complet.
 */
export async function awardCompetitionBadges(supabase: SupabaseClient, horseId: string): Promise<void> {
  const userId = await getHorseOwnerId(supabase, horseId);
  if (!userId) return;

  const { data: comps } = await supabase
    .from("competitions")
    .select("date, result_rank, total_riders, level")
    .eq("horse_id", horseId);
  if (!comps) return;

  // premier_concours : ≥1 concours
  if (comps.length >= 1) {
    await checkAndAwardBadge(supabase, horseId, userId, "premier_concours");
  }

  // podium : rank ≤ 3 avec total_riders renseigné (= concours classé)
  const hasPodium = comps.some((c: any) => c.result_rank && c.total_riders && c.result_rank <= 3);
  if (hasPodium) {
    await checkAndAwardBadge(supabase, horseId, userId, "podium");
  }

  // vainqueur : rank = 1 (concours classé)
  const hasWinner = comps.some((c: any) => c.result_rank === 1 && c.total_riders);
  if (hasWinner) {
    await checkAndAwardBadge(supabase, horseId, userId, "vainqueur");
  }

  // premiere_saison : ≥5 concours classés sur la saison sportive en cours
  const seasonStart = getSportSeasonStart(new Date());
  const rankedThisSeason = comps.filter(
    (c: any) => c.date && new Date(c.date) >= seasonStart && c.result_rank != null && c.total_riders != null,
  );
  if (rankedThisSeason.length >= 5) {
    await checkAndAwardBadge(supabase, horseId, userId, "premiere_saison");
  }

  // amateur : ≥1 concours avec level Amateur+ (Amateur, Pro, Elite, CCI/CDI/CSI)
  const hasAmateurLevel = comps.some((c: any) => isAmateurLevel(c.level));
  if (hasAmateurLevel) {
    await checkAndAwardBadge(supabase, horseId, userId, "amateur");
  }

  await awardDuoCompletIfReady(supabase, horseId, userId);
}

/**
 * Trigger déclenché après l'INSERT d'un health_record ou d'une horse_nutrition.
 * Couvre : duo_complet uniquement (pas de badge spécifique soin/nutrition).
 */
export async function awardHealthOrNutritionBadges(supabase: SupabaseClient, horseId: string): Promise<void> {
  const userId = await getHorseOwnerId(supabase, horseId);
  if (!userId) return;
  await awardDuoCompletIfReady(supabase, horseId, userId);
}

/**
 * Trigger déclenché après mise à jour du score Horse Index.
 * Couvre : horse_index_80.
 */
export async function awardHorseIndexBadge(
  supabase: SupabaseClient,
  horseId: string,
  score: number,
): Promise<void> {
  if (score < 80) return;
  const userId = await getHorseOwnerId(supabase, horseId);
  if (!userId) return;
  await checkAndAwardBadge(supabase, horseId, userId, "horse_index_80");
}

