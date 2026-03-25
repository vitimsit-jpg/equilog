"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * TRAV-19 — Indique si l'utilisateur connecté monte ce cheval.
 * Lit la table horse_user_roles. Par défaut (aucune ligne) → true.
 */
export function useRidesHorse(horseId: string): {
  ridesHorse: boolean;
  loading: boolean;
} {
  const [ridesHorse, setRidesHorse] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!horseId) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("horse_user_roles")
        .select("rides_horse")
        .eq("horse_id", horseId)
        .eq("user_id", user.id)
        .maybeSingle();
      // Si pas de ligne → propriétaire classique → monte par défaut
      setRidesHorse(data?.rides_horse ?? true);
      setLoading(false);
    });
  }, [horseId]);

  return { ridesHorse, loading };
}
