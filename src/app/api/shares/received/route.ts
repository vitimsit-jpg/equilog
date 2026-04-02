import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = cookies();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );

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
