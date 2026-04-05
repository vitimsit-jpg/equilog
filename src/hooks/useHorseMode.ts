"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { HorseIndexMode } from "@/lib/supabase/types";

export type HorseModeInfo = {
  mode: HorseIndexMode | null;
  modeSince: string | null;
  modeReason: string | null;
  /** true si mode non-actif (IS, IR, ICr) */
  isInactif: boolean;
  /** true si mode implique un protocole de rééducation */
  isRehab: boolean;
  /** true si poulain en développement */
  isJeune: boolean;
  /** true si retraite */
  isRetraite: boolean;
  loading: boolean;
};

const INACTIVE_MODES: HorseIndexMode[] = ["IS", "IR", "ICr"];
const REHAB_MODES:    HorseIndexMode[] = ["IR", "IP"];
const JEUNE_MODES:    HorseIndexMode[] = ["ICr"];
const RETRAITE_MODES: HorseIndexMode[] = ["IS"];

export function useHorseMode(horseId: string): HorseModeInfo {
  const [info, setInfo] = useState<HorseModeInfo>({
    mode: null,
    modeSince: null,
    modeReason: null,
    isInactif: false,
    isRehab: false,
    isJeune: false,
    isRetraite: false,
    loading: true,
  });

  useEffect(() => {
    if (!horseId) return;
    const supabase = createClient();
    supabase
      .from("horses")
      .select("horse_index_mode, horse_mode_since, horse_mode_reason")
      .eq("id", horseId)
      .single()
      .then(({ data }) => {
        const mode = data?.horse_index_mode ?? null;
        setInfo({
          mode,
          modeSince: data?.horse_mode_since ?? null,
          modeReason: data?.horse_mode_reason ?? null,
          isInactif: mode ? INACTIVE_MODES.includes(mode) : false,
          isRehab:   mode ? REHAB_MODES.includes(mode)    : false,
          isJeune:   mode ? JEUNE_MODES.includes(mode)    : false,
          isRetraite: mode ? RETRAITE_MODES.includes(mode) : false,
          loading: false,
        });
      });
  }, [horseId]);

  return info;
}

/** Libellés courts par mode */
export const HORSE_MODE_LABELS: Record<HorseIndexMode, string> = {
  IC:  "Compétition",
  IE:  "Équilibre",
  IP:  "Rééducation",
  IR:  "Convalescence",
  IS:  "Retraite",
  ICr: "Croissance",
};

/** Emojis par mode */
export const HORSE_MODE_EMOJIS: Record<HorseIndexMode, string> = {
  IC:  "🏆",
  IE:  "🌿",
  IP:  "🔄",
  IR:  "💊",
  IS:  "🌸",
  ICr: "🌱",
};
