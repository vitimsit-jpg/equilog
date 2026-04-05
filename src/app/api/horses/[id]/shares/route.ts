import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { parseBody, ShareCreateSchema } from "@/lib/schemas";

function createClient() {
  const cookieStore = cookies();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServerClient<any>(
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
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Vérifier propriétaire
  const { data: horse } = await supabase.from("horses").select("id").eq("id", params.id).eq("user_id", user.id).single();
  if (!horse) return NextResponse.json({ error: "Cheval introuvable" }, { status: 404 });

  const { data: shares, error } = await supabase
    .from("horse_shares")
    .select("*, shared_with_user:users!shared_with_user_id(name)")
    .eq("horse_id", params.id)
    .neq("status", "revoked")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aplatir le join
  const result = (shares || []).map((s) => ({
    ...s,
    shared_with_name: s.shared_with_user?.name ?? null,
    shared_with_user: undefined,
  }));

  return NextResponse.json({ shares: result });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Vérifier propriétaire
  const { data: horse } = await supabase.from("horses").select("id").eq("id", params.id).eq("user_id", user.id).single();
  if (!horse) return NextResponse.json({ error: "Cheval introuvable" }, { status: 404 });

  const parsed = parseBody(ShareCreateSchema, await request.json());
  if (!parsed.success) return parsed.response;
  const { email, role, can_see_training, can_see_health, can_see_competitions, can_see_planning } = parsed.data;

  // Empêcher auto-partage
  if (email === user.email?.toLowerCase()) {
    return NextResponse.json({ error: "Vous ne pouvez pas partager avec vous-même" }, { status: 400 });
  }

  // Chercher si l'invité a déjà un compte
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email.toLowerCase())
    .single();

  const alreadyUser = !!existingUser;
  const sharedWithUserId = existingUser?.id ?? null;
  const status = alreadyUser ? "active" : "pending";

  const { data: share, error } = await supabase
    .from("horse_shares")
    .upsert({
      horse_id: params.id,
      shared_with_email: email.toLowerCase(),
      shared_with_user_id: sharedWithUserId,
      role,
      can_see_training: can_see_training ?? true,
      can_see_health: can_see_health ?? false,
      can_see_competitions: can_see_competitions ?? true,
      can_see_planning: can_see_planning ?? true,
      status,
      invited_by: user.id,
    }, { onConflict: "horse_id,shared_with_email" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ share, alreadyUser }, { status: 201 });
}
