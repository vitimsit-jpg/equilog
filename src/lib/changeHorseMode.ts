import { createClient } from "@/lib/supabase/client";
import type { HorseIndexMode } from "@/lib/supabase/types";

/**
 * TRAV-23 — Change le mode de vie d'un cheval.
 * Met à jour horses + insère un enregistrement dans horse_mode_history.
 */
export async function changeHorseMode({
  horseId,
  modeFrom,
  modeTo,
  reason,
}: {
  horseId: string;
  modeFrom: HorseIndexMode | null;
  modeTo: HorseIndexMode;
  reason?: string;
}): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  // 1. Mettre à jour le cheval
  const { error: horseErr } = await supabase
    .from("horses")
    .update({
      horse_index_mode: modeTo,
      horse_mode_since: new Date().toISOString(),
      horse_mode_reason: reason ?? null,
    })
    .eq("id", horseId)
    .eq("user_id", user.id);

  if (horseErr) return { error: horseErr.message };

  // 2. Historiser la transition
  if (modeFrom !== modeTo) {
    await supabase.from("horse_mode_history").insert({
      horse_id: horseId,
      user_id: user.id,
      mode_from: modeFrom,
      mode_to: modeTo,
      reason: reason ?? null,
    });
  }

  return { error: null };
}
