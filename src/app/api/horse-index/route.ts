import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { calculateHorseIndex } from "@/lib/horse-index/calculator";
import { differenceInDays } from "date-fns";
import type { HorseIndexMode } from "@/lib/supabase/types";

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { horseId } = await request.json();
  if (!horseId) {
    return NextResponse.json({ error: "Missing horseId" }, { status: 400 });
  }

  // Verify horse ownership — include all profile fields needed for Suivi proprio
  const { data: horse } = await supabase
    .from("horses")
    .select("id, user_id, discipline, region, ecurie, breed, birth_year, conditions_vie, trousseau, horse_index_mode, horse_index_mode_changed_at")
    .eq("id", horseId)
    .eq("user_id", user.id)
    .single();

  if (!horse) {
    return NextResponse.json({ error: "Horse not found" }, { status: 404 });
  }

  const [
    { data: trainingSessions },
    { data: healthRecords },
    { data: competitions },
    { data: wearableData },
  ] = await Promise.all([
    supabase.from("training_sessions").select("*").eq("horse_id", horseId),
    supabase.from("health_records").select("*").eq("horse_id", horseId),
    supabase.from("competitions").select("*").eq("horse_id", horseId),
    supabase.from("wearable_data").select("*").eq("horse_id", horseId),
  ]);

  const mode = (horse.horse_index_mode as HorseIndexMode) || "IE";
  const breakdown = calculateHorseIndex(
    {
      trainingSessions: trainingSessions || [],
      healthRecords: healthRecords || [],
      competitions: competitions || [],
      wearableData: wearableData || [],
      horseProfile: {
        breed: horse.breed,
        birth_year: horse.birth_year,
        conditions_vie: horse.conditions_vie,
        ecurie: horse.ecurie,
        trousseau: horse.trousseau,
      },
    },
    mode,
  );

  // ── Déterminer le statut (HI-08 / HI-10) ────────────────────────────────
  const now = new Date();
  const recentTraining = (trainingSessions || []).some(
    (s: { date: string }) => differenceInDays(now, new Date(s.date)) <= 14
  );
  const recentHealth = (healthRecords || []).some(
    (r: { date: string }) => differenceInDays(now, new Date(r.date)) <= 14
  );
  const hasRecentEntry = recentTraining || recentHealth;

  let horse_index_status: "actif" | "incomplet" | "calibrage";
  if (!horse.horse_index_mode || !hasRecentEntry) {
    horse_index_status = "incomplet";
  } else if (
    horse.horse_index_mode_changed_at &&
    differenceInDays(now, new Date(horse.horse_index_mode_changed_at)) < (horse.horse_index_mode === "ICr" ? 180 : 30)
  ) {
    horse_index_status = "calibrage";
  } else {
    horse_index_status = "actif";
  }

  // Mettre à jour le statut sur le cheval
  await supabase
    .from("horses")
    .update({ horse_index_status })
    .eq("id", horseId);

  // ── Percentiles filtrés par indice (HI-01 — comparabilité par mode) ───────
  // Un score IC ne se compare qu'avec des scores IC, etc.
  let percentileRegion: number | null = null;
  let percentileCategory: number | null = null;

  if (horse.region) {
    const { data: regionScores } = await supabase
      .from("horse_scores")
      .select("score, score_breakdown")
      .eq("region", horse.region)
      .order("computed_at", { ascending: false });

    // Filtrer par même mode d'indice
    const sameMode = (regionScores || []).filter(
      (s: { score_breakdown: { mode?: string } }) => s.score_breakdown?.mode === mode
    );

    if (sameMode.length >= 10) {
      const sorted = sameMode.map((s: { score: number }) => s.score).sort((a: number, b: number) => a - b);
      const position = sorted.filter((s: number) => s < breakdown.total).length;
      percentileRegion = Math.round((position / sorted.length) * 100);
    }
  }

  if (horse.discipline) {
    const { data: categoryScores } = await supabase
      .from("horse_scores")
      .select("score, score_breakdown, horses!inner(discipline, horse_index_mode)")
      .eq("horses.discipline", horse.discipline)
      .eq("horses.horse_index_mode", mode) // même indice uniquement
      .order("computed_at", { ascending: false });

    if (categoryScores && categoryScores.length >= 10) {
      const sorted = categoryScores.map((s: { score: number }) => s.score).sort((a: number, b: number) => a - b);
      const position = sorted.filter((s: number) => s < breakdown.total).length;
      percentileCategory = Math.round((position / sorted.length) * 100);
    }
  }

  const { data: newScore, error } = await supabase
    .from("horse_scores")
    .insert({
      horse_id: horseId,
      score: breakdown.total,
      score_breakdown: breakdown,
      computed_at: new Date().toISOString(),
      percentile_region: percentileRegion,
      percentile_category: percentileCategory,
      region: horse.region,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ score: newScore });
}
