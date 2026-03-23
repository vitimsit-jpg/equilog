import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST — rejoindre un défi
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { challenge_id, horse_id } = await req.json();
  if (!challenge_id) return NextResponse.json({ error: "challenge_id required" }, { status: 400 });

  const { error } = await supabase
    .from("challenge_participants")
    .upsert(
      { challenge_id, user_id: user.id, horse_id: horse_id ?? null, status: "active", joined_at: new Date().toISOString() },
      { onConflict: "challenge_id,user_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — quitter un défi
export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { challenge_id } = await req.json();
  if (!challenge_id) return NextResponse.json({ error: "challenge_id required" }, { status: 400 });

  const { error } = await supabase
    .from("challenge_participants")
    .delete()
    .eq("challenge_id", challenge_id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
