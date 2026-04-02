import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { generateWeeklyInsight } from "@/lib/claude/insights";

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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { horseId } = await request.json();
  if (!horseId) return NextResponse.json({ error: "Missing horseId" }, { status: 400 });

  const [
    { data: horse },
    { data: userProfile },
  ] = await Promise.all([
    supabase.from("horses").select("*").eq("id", horseId).eq("user_id", user.id).single(),
    supabase.from("users").select("user_type, plan").eq("id", user.id).single(),
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
    supabase.from("training_sessions").select("*").eq("horse_id", horseId).order("date", { ascending: false }).limit(60),
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
    userType: userProfile?.user_type ?? null,
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
