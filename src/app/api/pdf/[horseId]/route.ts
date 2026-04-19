import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { horseId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: userProfile } = await supabase
    .from("users")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (!userProfile || !["pro", "ecurie"].includes(userProfile.plan)) {
    return NextResponse.json({ error: "Plan Pro requis" }, { status: 403 });
  }

  const { horseId } = params;
  const yearAgo = new Date();
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const since = yearAgo.toISOString().split("T")[0];

  const [
    { data: horse },
    { data: health },
    { data: training },
    { data: competitions },
    { data: budget },
  ] = await Promise.all([
    supabase.from("horses").select("*").eq("id", horseId).eq("user_id", user.id).single(),
    supabase.from("health_records").select("*").eq("horse_id", horseId).gte("date", since).order("date", { ascending: false }).limit(200),
    supabase.from("training_sessions").select("*").eq("horse_id", horseId).is("deleted_at", null).gte("date", since).order("date", { ascending: false }).limit(400),
    supabase.from("competitions").select("*").eq("horse_id", horseId).gte("date", since).order("date", { ascending: false }).limit(100),
    supabase.from("budget_entries").select("*").eq("horse_id", horseId).gte("date", since).order("date", { ascending: false }).limit(500),
  ]);

  if (!horse) return NextResponse.json({ error: "Cheval introuvable" }, { status: 404 });

  return NextResponse.json({ horse, health, training, competitions, budget });
}
