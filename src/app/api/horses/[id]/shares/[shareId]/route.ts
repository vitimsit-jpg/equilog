import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; shareId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Vérifier propriétaire
  const { data: horse } = await supabase.from("horses").select("id").eq("id", params.id).eq("user_id", user.id).single();
  if (!horse) return NextResponse.json({ error: "Cheval introuvable" }, { status: 404 });

  const { error } = await supabase
    .from("horse_shares")
    .update({ status: "revoked" })
    .eq("id", params.shareId)
    .eq("horse_id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
