import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Auto-accepter les invitations pending dont l'email correspond
  if (user.email) {
    await supabase
      .from("horse_shares")
      .update({ shared_with_user_id: user.id, status: "active" })
      .eq("shared_with_email", user.email)
      .eq("status", "pending");
  }

  const { data: shares, error } = await supabase
    .from("horse_shares")
    .select(`
      *,
      horse:horses(id, name, breed, avatar_url, horse_index_mode),
      owner:users!invited_by(name, email)
    `)
    .eq("shared_with_user_id", user.id)
    .neq("status", "revoked")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ shares: shares || [] });
}
