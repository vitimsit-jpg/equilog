import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NutritionRation } from "@/lib/supabase/types";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { horseId, ration, reason } = body as {
    horseId: string;
    ration: NutritionRation;
    reason?: string;
  };

  if (!horseId || !ration) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify horse ownership
  const { data: horse } = await supabase
    .from("horses")
    .select("id")
    .eq("id", horseId)
    .eq("user_id", user.id)
    .single();

  if (!horse) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get existing ration for history snapshot
  const { data: existing } = await supabase
    .from("horse_nutrition")
    .select("fibres, herbe, granules, complements")
    .eq("horse_id", horseId)
    .maybeSingle();

  // Upsert ration
  const { error } = await supabase
    .from("horse_nutrition")
    .upsert({
      horse_id: horseId,
      user_id: user.id,
      fibres: ration.fibres,
      herbe: ration.herbe,
      granules: ration.granules,
      complements: ration.complements,
      updated_at: new Date().toISOString(),
    }, { onConflict: "horse_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log to history (snapshot of previous state)
  if (existing) {
    await supabase.from("nutrition_history").insert({
      horse_id: horseId,
      user_id: user.id,
      element: "Ration mise à jour",
      old_value: null,
      new_value: null,
      reason: reason || null,
      snapshot: existing,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const horseId = searchParams.get("horseId");
  if (!horseId) return NextResponse.json({ error: "Missing horseId" }, { status: 400 });

  const { data: nutrition } = await supabase
    .from("horse_nutrition")
    .select("*")
    .eq("horse_id", horseId)
    .maybeSingle();

  return NextResponse.json({ nutrition });
}
