import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { item_type, item_id } = await request.json();
  if (!item_type || !item_id) {
    return NextResponse.json({ error: "Missing item_type or item_id" }, { status: 400 });
  }

  // Check if reaction already exists
  const { data: existing } = await supabase
    .from("feed_reactions")
    .select("id")
    .eq("user_id", user.id)
    .eq("item_type", item_type)
    .eq("item_id", item_id)
    .single();

  if (existing) {
    // Toggle off
    await supabase.from("feed_reactions").delete().eq("id", existing.id);
    const { count } = await supabase
      .from("feed_reactions")
      .select("*", { count: "exact", head: true })
      .eq("item_type", item_type)
      .eq("item_id", item_id);
    return NextResponse.json({ liked: false, count: count ?? 0 });
  } else {
    // Toggle on
    await supabase.from("feed_reactions").insert({ user_id: user.id, item_type, item_id });
    const { count } = await supabase
      .from("feed_reactions")
      .select("*", { count: "exact", head: true })
      .eq("item_type", item_type)
      .eq("item_id", item_id);
    return NextResponse.json({ liked: true, count: count ?? 0 });
  }
}
