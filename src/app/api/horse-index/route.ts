import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { calculateHorseIndex } from "@/lib/horse-index/calculator";

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

  // Verify horse ownership
  const { data: horse } = await supabase
    .from("horses")
    .select("id, user_id, discipline, region")
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

  const breakdown = calculateHorseIndex({
    trainingSessions: trainingSessions || [],
    healthRecords: healthRecords || [],
    competitions: competitions || [],
    wearableData: wearableData || [],
  });

  // Calculate percentiles
  let percentileRegion: number | null = null;
  let percentileCategory: number | null = null;

  if (horse.region) {
    const { data: regionScores } = await supabase
      .from("horse_scores")
      .select("score")
      .eq("region", horse.region)
      .order("computed_at", { ascending: false });

    if (regionScores && regionScores.length >= 10) {
      const sorted = regionScores.map((s) => s.score).sort((a, b) => a - b);
      const position = sorted.filter((s) => s < breakdown.total).length;
      percentileRegion = Math.round((position / sorted.length) * 100);
    }
  }

  if (horse.discipline) {
    const { data: categoryScores } = await supabase
      .from("horse_scores")
      .select("score, horses!inner(discipline)")
      .eq("horses.discipline", horse.discipline)
      .order("computed_at", { ascending: false });

    if (categoryScores && categoryScores.length >= 10) {
      const sorted = categoryScores.map((s) => s.score).sort((a, b) => a - b);
      const position = sorted.filter((s) => s < breakdown.total).length;
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
