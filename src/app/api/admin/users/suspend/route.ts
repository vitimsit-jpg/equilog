import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Verify requester is admin
  const { data: profile } = await admin.from("users").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, reason } = await request.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const { error } = await admin
    .from("users")
    .update({ status: "suspended", suspended_at: new Date().toISOString(), suspension_reason: reason || null })
    .eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  await admin.from("audit_logs").insert({
    admin_id: user.id,
    action: "suspend_user",
    resource_type: "user",
    resource_id: userId,
    details: { reason: reason || null },
  });

  return NextResponse.json({ ok: true });
}
