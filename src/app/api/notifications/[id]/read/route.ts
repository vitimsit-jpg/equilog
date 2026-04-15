import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/notifications/[id]/read — marquer une notif comme lue
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!params.id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  // RLS sécurise déjà l'accès, mais on filtre explicitement par user_id en plus
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
