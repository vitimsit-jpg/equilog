"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { HorseUserRole } from "@/lib/supabase/types";

interface RidesHorseState {
  ridesHorse: boolean | null; // null = not set yet (P0 step pending)
  role: HorseUserRole | null;
  loading: boolean;
  refetch: () => void;
}

export function useRidesHorse(horseId: string | null): RidesHorseState {
  const [ridesHorse, setRidesHorse] = useState<boolean | null>(null);
  const [role, setRole] = useState<HorseUserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!horseId) { setLoading(false); return; }
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setLoading(false); return; }
      const { data } = await supabase
        .from("horse_user_roles")
        .select("rides_horse, role")
        .eq("horse_id", horseId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) {
        setRidesHorse(data?.rides_horse ?? null);
        setRole((data?.role as HorseUserRole) ?? null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [horseId, tick]);

  return { ridesHorse, role, loading, refetch: () => setTick((t) => t + 1) };
}
