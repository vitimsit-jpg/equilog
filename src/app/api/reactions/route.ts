import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseBody, ReactionSchema } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = parseBody(ReactionSchema, await request.json());
  if (!parsed.success) return parsed.response;
  const { item_type, item_id, reaction_type: type } = parsed.data;

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
      const { error } = await supabase.from("feed_reactions").delete().eq("id", existing.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      // Different emoji → change type
      const { error } = await supabase.from("feed_reactions").update({ reaction_type: type }).eq("id", existing.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // No reaction yet → insert
    const { error } = await supabase.from("feed_reactions").insert({
      user_id: user.id,
      item_type,
      item_id,
      reaction_type: type,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
