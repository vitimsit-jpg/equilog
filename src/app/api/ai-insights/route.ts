import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWeeklyInsight } from "@/lib/claude/insights";

export async function POST(request: NextRequest) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { horseId } = await request.json();
  if (!horseId) return NextResponse.json({ error: "Missing horseId" }, { status: 400 });

  const [
    { data: horse },
    { data: userProfile },
  ] = await Promise.all([
    supabase.from("horses").select("*").eq("id", horseId).eq("user_id", user.id).single(),
    supabase.from("users").select("profile_type, user_type, plan, module_coach, rider_niveau, rider_objectif, rider_frequence, rider_disciplines, rider_zones_douloureuses, rider_asymetrie, rider_pathologies, rider_suivi_corps").eq("id", user.id).single(),
  ]);

  if (!horse) return NextResponse.json({ error: "Horse not found" }, { status: 404 });

  if ((userProfile?.plan ?? "starter") === "starter") {
    return NextResponse.json({ error: "Plan Pro requis pour les AI Insights" }, { status: 403 });
  }

  const [
    { data: trainingSessions },
    { data: healthRecords },
    { data: competitions },
    { data: scores },
  ] = await Promise.all([
    supabase.from("training_sessions").select("*").eq("horse_id", horseId).is("deleted_at", null).order("date", { ascending: false }).limit(60),
    supabase.from("health_records").select("*").eq("horse_id", horseId).order("date", { ascending: false }).limit(20),
    supabase.from("competitions").select("*").eq("horse_id", horseId).order("date", { ascending: false }).limit(10),
    supabase.from("horse_scores").select("*").eq("horse_id", horseId).order("computed_at", { ascending: false }).limit(1),
  ]);

  const insight = await generateWeeklyInsight({
    horse,
    trainingSessions: trainingSessions || [],
    healthRecords: healthRecords || [],
    competitions: competitions || [],
    currentScore: scores?.[0] ?? null,
    userType: userProfile?.profile_type ?? userProfile?.user_type ?? null,
    riderNiveau: userProfile?.rider_niveau ?? null,
    riderObjectif: userProfile?.rider_objectif ?? null,
    riderFrequence: userProfile?.rider_frequence ?? null,
    riderDisciplines: (userProfile?.rider_disciplines as string[] | null) ?? null,
    moduleCoach: userProfile?.module_coach ?? false,
    riderZones: (userProfile?.rider_zones_douloureuses as string[] | null) ?? null,
    riderAsymetrie: (userProfile?.rider_asymetrie as string | null) ?? null,
    riderPathologies: (userProfile?.rider_pathologies as string | null) ?? null,
    riderSuiviCorps: (userProfile?.rider_suivi_corps as Record<string, { actif: boolean; frequence?: string }> | null) ?? null,
  });

  const { data: savedInsight, error } = await supabase
    .from("ai_insights")
    .insert({
      horse_id: horseId,
      content: JSON.stringify(insight),
      generated_at: new Date().toISOString(),
      type: "weekly",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ insight: savedInsight });
}
