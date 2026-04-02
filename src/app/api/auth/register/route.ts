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

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Configuration serveur manquante (SUPABASE_SERVICE_ROLE_KEY)" }, { status: 500 });
  }

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
    console.error("Profile upsert error:", profileError.message);
  }

  return NextResponse.json({ ok: true });
}
