import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTrainingPlan } from "@/lib/claude/insights";

export async function POST(request: NextRequest) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { horseId } = await request.json();
  if (!horseId) return NextResponse.json({ error: "Missing horseId" }, { status: 400 });

  const { data: horse } = await supabase
    .from("horses")
    .select("*")
    .eq("id", horseId)
    .eq("user_id", user.id)
    .single();

  if (!horse) return NextResponse.json({ error: "Horse not found" }, { status: 404 });

  const [
    { data: recentSessions },
    { data: upcomingCompetitions },
    { data: scores },
    { data: healthRecords },
  ] = await Promise.all([
    supabase.from("training_sessions").select("*").eq("horse_id", horseId).is("deleted_at", null).order("date", { ascending: false }).limit(28),
    supabase.from("competitions").select("*").eq("horse_id", horseId).order("date", { ascending: false }).limit(5),
    supabase.from("horse_scores").select("*").eq("horse_id", horseId).order("computed_at", { ascending: false }).limit(1),
    supabase.from("health_records").select("*").eq("horse_id", horseId).order("date", { ascending: false }).limit(10),
  ]);

  let plan;
  try {
    plan = await generateTrainingPlan({
      horse,
      recentSessions: recentSessions || [],
      upcomingCompetitions: upcomingCompetitions || [],
      currentScore: scores?.[0] ?? null,
      healthRecords: healthRecords || [],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur Claude API";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const { data: savedPlan, error } = await supabase
    .from("ai_insights")
    .insert({
      horse_id: horseId,
      content: JSON.stringify(plan),
      generated_at: new Date().toISOString(),
      type: "training_plan",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ plan: savedPlan });
}
