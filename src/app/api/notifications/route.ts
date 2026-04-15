import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/lib/supabase/types";

// GET /api/notifications — liste des 20 dernières + nb non-lues
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: notifications }, { count: unreadCount }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, user_id, type, title, body, url, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false),
  ]);

  return NextResponse.json({
    notifications: (notifications ?? []) as unknown as Notification[],
    unreadCount: unreadCount ?? 0,
  });
}

// POST /api/notifications  body: { action: "mark_all_read" }
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  if (body?.action !== "mark_all_read") {
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
