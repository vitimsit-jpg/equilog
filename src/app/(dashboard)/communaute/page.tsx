import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TrendingUp, Users } from "lucide-react";
import CommunauteFeed from "@/components/community/CommunauteFeed";
import UpgradeBanner from "@/components/ui/UpgradeBanner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FeedItem = { date: string; type: "session" | "competition"; data: any; horse: any };

export default async function CommunautePage() {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { data: userProfile } = await supabase
    .from("users")
    .select("user_type, plan")
    .eq("id", authUser.id)
    .single();

  if (userProfile?.plan === "starter") {
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <h1 className="text-2xl font-black text-black mb-4">Réseaux</h1>
        <UpgradeBanner feature="Réseaux" />
      </div>
    );
  }

  const userType = userProfile?.user_type || "loisir";
  const isCompetitor = ["competition", "pro", "gerant_cavalier"].includes(userType);

  // Get user's horses to find their écurie
  const { data: myHorses } = await supabase
    .from("horses")
    .select("ecurie")
    .eq("user_id", authUser.id);

  const userEcuries = Array.from(
    new Set((myHorses || []).map((h) => h.ecurie).filter(Boolean))
  ) as string[];

  if (userEcuries.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-black text-black">Réseaux</h1>
          <p className="text-sm text-gray-400 mt-0.5">L&apos;activité de votre écurie</p>
        </div>
        <div className="card text-center py-12">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange to-orange/60 flex items-center justify-center mx-auto mb-4 shadow-orange">
            <Users className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-lg font-bold text-black mb-2">Rejoignez une écurie</h2>
          <p className="text-sm text-gray-400 max-w-sm mx-auto mb-5">
            Renseignez le nom de votre écurie sur la fiche de votre cheval pour voir l&apos;activité des autres pensionnaires.
          </p>
          <Link href="/horses/new" className="btn-primary">Ajouter un cheval</Link>
        </div>
      </div>
    );
  }

  // Fetch ecurie horses (that share their data)
  const { data: ecurieHorses } = await supabase
    .from("horses")
    .select("*")
    .in("ecurie", userEcuries)
    .eq("share_horse_index", true)
    .limit(50);

  const ecurieHorseIds = (ecurieHorses || []).map((h) => h.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const horseById: Record<string, any> = {};
  (ecurieHorses || []).forEach((h) => { horseById[h.id] = h; });

  // Fetch recent activity + reactions
  const [
    { data: recentSessions },
    { data: recentCompetitions },
    { data: recentScores },
    { data: allReactions },
    { data: myReactions },
  ] = await Promise.all([
    ecurieHorseIds.length
      ? supabase.from("training_sessions").select("*").in("horse_id", ecurieHorseIds).order("date", { ascending: false }).limit(30)
      : Promise.resolve({ data: [] }),
    ecurieHorseIds.length
      ? supabase.from("competitions").select("*").in("horse_id", ecurieHorseIds).order("date", { ascending: false }).limit(20)
      : Promise.resolve({ data: [] }),
    ecurieHorseIds.length
      ? supabase.from("horse_scores").select("*").in("horse_id", ecurieHorseIds).order("computed_at", { ascending: false }).limit(ecurieHorseIds.length * 2)
      : Promise.resolve({ data: [] }),
    supabase.from("feed_reactions").select("item_type, item_id, reaction_type"),
    supabase.from("feed_reactions").select("item_type, item_id, reaction_type").eq("user_id", authUser.id),
  ]);

  // Build reaction maps per item + type
  const reactionCountsMap: Record<string, Record<string, number>> = {};
  (allReactions || []).forEach((r) => {
    const key = `${r.item_type}:${r.item_id}`;
    if (!reactionCountsMap[key]) reactionCountsMap[key] = {};
    const t = (r.reaction_type as string) || "like";
    reactionCountsMap[key][t] = (reactionCountsMap[key][t] || 0) + 1;
  });

  // User's reaction per item
  const myReactionMap: Record<string, string> = {};
  (myReactions || []).forEach((r) => {
    const key = `${r.item_type}:${r.item_id}`;
    myReactionMap[key] = (r.reaction_type as string) || "like";
  });

  // Latest score per ecurie horse
  const latestScoreByHorse: Record<string, number> = {};
  (recentScores || []).forEach((s) => {
    if (!latestScoreByHorse[s.horse_id]) latestScoreByHorse[s.horse_id] = s.score;
  });

  // Build unified feed
  const feed: FeedItem[] = [
    ...(recentSessions || []).map((s) => ({
      date: s.date,
      type: "session" as const,
      data: s,
      horse: horseById[s.horse_id],
    })),
    ...(recentCompetitions || []).map((c) => ({
      date: c.date,
      type: "competition" as const,
      data: c,
      horse: horseById[c.horse_id],
    })),
  ]
    .filter((item) => item.horse)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 25);

  // Fetch comments for feed items
  const feedItemIds = feed.map((item) => item.data.id);
  const { data: allComments } = feedItemIds.length
    ? await supabase
        .from("feed_comments")
        .select("*")
        .in("item_id", feedItemIds)
        .order("created_at", { ascending: true })
    : { data: [] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const commentsByItem: Record<string, any[]> = {};
  (allComments || []).forEach((c) => {
    if (!commentsByItem[c.item_id]) commentsByItem[c.item_id] = [];
    commentsByItem[c.item_id].push(c);
  });

  // Rankings
  const rankedHorses = [...(ecurieHorses || [])].sort(
    (a, b) => (latestScoreByHorse[b.id] ?? 0) - (latestScoreByHorse[a.id] ?? 0)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-orange" />
        <div>
          <h1 className="text-2xl font-black text-black">Réseaux</h1>
          <p className="text-sm text-gray-400">
            {userEcuries[0]}
            {ecurieHorses && ecurieHorses.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 rounded-full text-2xs font-semibold text-gray-500">
                {ecurieHorses.length} cheval{ecurieHorses.length > 1 ? "x" : ""}
              </span>
            )}
          </p>
        </div>
      </div>

      {feed.length === 0 && ecurieHorseIds.length > 0 ? (
        <div className="card text-center py-12">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange to-orange/60 flex items-center justify-center mx-auto mb-4 shadow-orange">
            <Users className="h-6 w-6 text-white" />
          </div>
          <p className="text-sm font-bold text-black mb-1.5">Aucune activité pour l&apos;instant</p>
          <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
            Les séances et concours apparaîtront ici dès qu&apos;un cheval de l&apos;écurie partage son activité.
          </p>
        </div>
      ) : (
        <CommunauteFeed
          feed={feed}
          reactionCountsMap={reactionCountsMap}
          myReactionMap={myReactionMap}
          commentsByItem={commentsByItem}
          currentUserId={authUser.id}
          isCompetitor={isCompetitor}
          rankedHorses={rankedHorses}
          latestScoreByHorse={latestScoreByHorse}
          ecurieHorses={ecurieHorses || []}
        />
      )}
    </div>
  );
}
