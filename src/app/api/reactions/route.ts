import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const VALID_TYPES = ["like", "fire", "strong", "trophy"] as const;
type ReactionType = (typeof VALID_TYPES)[number];

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

  const { item_type, item_id, reaction_type = "like" } = await request.json();
  if (!item_type || !item_id) {
    return NextResponse.json({ error: "Missing item_type or item_id" }, { status: 400 });
  }
  const type: ReactionType = VALID_TYPES.includes(reaction_type) ? reaction_type : "like";

  // Check if user already has a reaction for this item (any type)
  const { data: existing } = await supabase
    .from("feed_reactions")
    .select("id, reaction_type")
    .eq("user_id", user.id)
    .eq("item_type", item_type)
    .eq("item_id", item_id)
    .single();

  if (existing) {
    if (existing.reaction_type === type) {
      // Same emoji → toggle off
      await supabase.from("feed_reactions").delete().eq("id", existing.id);
    } else {
      // Different emoji → change type
      await supabase.from("feed_reactions").update({ reaction_type: type }).eq("id", existing.id);
    }
  } else {
    // No reaction yet → insert
    await supabase.from("feed_reactions").insert({
      user_id: user.id,
      item_type,
      item_id,
      reaction_type: type,
    });
  }

  // Fetch updated counts per type
  const { data: allReactions } = await supabase
    .from("feed_reactions")
    .select("reaction_type")
    .eq("item_type", item_type)
    .eq("item_id", item_id);

  const counts: Record<string, number> = { like: 0, fire: 0, strong: 0, trophy: 0 };
  (allReactions || []).forEach((r) => {
    const t = r.reaction_type as string;
    if (t in counts) counts[t]++;
  });

  // Check user's current reaction
  const { data: myReaction } = await supabase
    .from("feed_reactions")
    .select("reaction_type")
    .eq("user_id", user.id)
    .eq("item_type", item_type)
    .eq("item_id", item_id)
    .single();

  return NextResponse.json({
    userReaction: myReaction?.reaction_type ?? null,
    counts,
    total: Object.values(counts).reduce((a, b) => a + b, 0),
  });
}
