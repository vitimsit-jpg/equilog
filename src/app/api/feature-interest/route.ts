import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("feature_interest")
    .select("feature_key")
    .eq("user_id", user.id);

  return NextResponse.json({ interests: (data || []).map((r) => r.feature_key) });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { featureKey } = await request.json();
  if (!featureKey) return NextResponse.json({ error: "featureKey required" }, { status: 400 });

  // Check if already registered
  const { data: existing } = await supabase
    .from("feature_interest")
    .select("id")
    .eq("user_id", user.id)
    .eq("feature_key", featureKey)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("feature_interest")
      .delete()
      .eq("user_id", user.id)
      .eq("feature_key", featureKey);
    return NextResponse.json({ registered: false });
  } else {
    await supabase
      .from("feature_interest")
      .insert({ user_id: user.id, feature_key: featureKey });
    return NextResponse.json({ registered: true });
  }
}
