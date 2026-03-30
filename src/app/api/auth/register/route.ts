import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TERMS_VERSION = "1.0";

export async function POST(request: NextRequest) {
  const { email, password, name } = await request.json();

  if (!email || !password || !name) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Mot de passe trop court" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Create user with email already confirmed — no confirmation email sent
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const userId = data.user.id;
  const now = new Date().toISOString();

  // Create the public.users row with top plan (ecurie = full access)
  const { error: profileError } = await admin.from("users").upsert({
    id: userId,
    email,
    name,
    plan: "ecurie",
    accepted_terms_at: now,
    accepted_terms_version: TERMS_VERSION,
    anonymous_stats_enabled: true,
  });

  if (profileError) {
    // User created in auth but profile failed — not blocking, trigger may have run
    console.error("Profile upsert error:", profileError.message);
  }

  return NextResponse.json({ ok: true });
}
