import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TrendingUp, Users, Trophy, Medal } from "lucide-react";
import CommunauteFeed from "@/components/community/CommunauteFeed";
import CommunauteTabs from "@/components/community/CommunauteTabs";
import ClassementsFilters from "@/components/classements/ClassementsFilters";
import HorseAvatar from "@/components/ui/HorseAvatar";
import DefisTab from "@/components/community/DefisTab";
import StreakBadge from "@/components/training/StreakBadge";
import { getScoreColor, getScoreLabel, DISCIPLINE_LABELS } from "@/lib/utils";
import { getStreakTarget } from "@/lib/streaks";
import { getISOWeek } from "date-fns";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FeedItem = { date: string; type: "session" | "competition"; data: any; horse: any };

interface SearchParams {
  tab?: string;
  discipline?: string;
  region?: string;
}

interface Props {
  searchParams: SearchParams;
}

export default async function CommunautePage({ searchParams }: Props) {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const activeTab = searchParams.tab || "feed";

  const { data: userProfile } = await supabase
    .from("users")
    .select("user_type")
    .eq("id", authUser.id)
    .single();

  const userType = userProfile?.user_type || "loisir";
  const isCompetitor = ["competition", "pro", "gerant_cavalier"].includes(userType);

  // ─── Classements tab ──────────────────────────────────────────────
  if (activeTab === "classements") {
    const discipline = searchParams.discipline || "";
    const region = searchParams.region || "";

    const { data: rawScores } = await supabase
      .from("horse_scores")
      .select("*, horses!inner(id, name, breed, discipline, ecurie, region, share_horse_index, avatar_url)")
      .eq("horses.share_horse_index", true)
      .order("score", { ascending: false })
      .limit(300);

    const seenHorses = new Set<string>();
    const scores = (rawScores || []).filter((s) => {
      const horseId = (s as any).horses?.id;
      if (!horseId || seenHorses.has(horseId)) return false;
      seenHorses.add(horseId);
      return true;
    });

    const filtered = scores.filter((s) => {
      const horse = (s as any).horses;
      if (discipline && horse.discipline !== discipline) return false;
      if (region && !horse.region?.toLowerCase().includes(region.toLowerCase())) return false;
      return true;
    });

    // Fetch streaks for visible horses
    const filteredHorseIds = filtered.map((s) => (s as any).horses.id).filter(Boolean);
    const { data: streakRows } = filteredHorseIds.length
      ? await supabase
          .from("horse_streaks")
          .select("horse_id, current_streak")
          .in("horse_id", filteredHorseIds)
      : { data: [] };
    const streakByHorse: Record<string, number> = {};
    (streakRows || []).forEach((r) => { streakByHorse[r.horse_id] = r.current_streak; });

    const disciplines = Object.keys(DISCIPLINE_LABELS).filter((d) => d !== "Autre");
    const regions = [
      "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretagne",
      "Centre-Val de Loire", "Corse", "Grand Est", "Hauts-de-France",
      "Île-de-France", "Normandie", "Nouvelle-Aquitaine", "Occitanie",
      "Pays de la Loire", "Provence-Alpes-Côte d'Azur",
    ];

    return (
      <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-orange" />
          <h1 className="text-2xl font-black text-black">Communauté</h1>
        </div>
        <CommunauteTabs activeTab="classements" />

        <div className="space-y-5">
          <div>
            <p className="text-sm text-gray-400">
              {filtered.length} {filtered.length > 1 ? "chevaux" : "cheval"} classé{filtered.length > 1 ? "s" : ""}
            </p>
          </div>
          <ClassementsFilters disciplines={disciplines} regions={regions} disciplineLabels={DISCIPLINE_LABELS} />

          {filtered.length >= 3 && !discipline && !region && (
            <div className="grid grid-cols-3 gap-3">
              {[filtered[1], filtered[0], filtered[2]].map((s, podiumIdx) => {
                const horse = (s as any).horses;
                const heights = ["h-24", "h-32", "h-20"];
                const medals = ["🥈", "🥇", "🥉"];
                return (
                  <Link
                    key={horse.id}
                    href={`/share/${horse.id}`}
                    className={`bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-end pb-4 ${heights[podiumIdx]} hover:shadow-md transition-shadow`}
                  >
                    <span className="text-xl mb-1">{medals[podiumIdx]}</span>
                    <HorseAvatar name={horse.name} photoUrl={horse.avatar_url} size="sm" rounded="full" className="mb-1" />
                    <p className="text-xs font-bold text-black truncate px-2 text-center">{horse.name}</p>
                    <div className="flex items-center gap-1">
                      <p className="text-lg font-black" style={{ color: getScoreColor(s.score) }}>{s.score}</p>
                      {(s as any).score_breakdown?.mode && (
                        <span className="text-xs font-mono font-bold text-orange">{(s as any).score_breakdown.mode}</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-gray-400 text-sm">Aucun cheval pour ces filtres</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {filtered.map((s, idx) => {
                const horse = (s as any).horses;
                const rank = idx + 1;
                return (
                  <Link
                    key={horse.id}
                    href={`/share/${horse.id}`}
                    className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <div className={`w-8 text-center flex-shrink-0 ${
                      rank === 1 ? "text-yellow-500" : rank === 2 ? "text-gray-400" : rank === 3 ? "text-amber-600" : "text-gray-300"
                    }`}>
                      {rank <= 3 && !discipline && !region
                        ? <Medal className="h-5 w-5 mx-auto" />
                        : <span className="text-sm font-bold text-gray-400">{rank}</span>
                      }
                    </div>
                    <HorseAvatar name={horse.name} photoUrl={horse.avatar_url} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-black truncate">{horse.name}</p>
                        {(streakByHorse[horse.id] ?? 0) >= 2 && (
                          <StreakBadge current={streakByHorse[horse.id]} best={0} target={getStreakTarget(null)} size="sm" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {[DISCIPLINE_LABELS[horse.discipline] || horse.discipline, horse.ecurie, horse.region]
                          .filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center justify-end gap-1.5">
                        <p className="text-xl font-black" style={{ color: getScoreColor(s.score) }}>{s.score}</p>
                        {(s as any).score_breakdown?.mode && (
                          <>
                            <span className="text-gray-300 font-light">·</span>
                            <span className="text-sm font-mono font-bold text-orange">{(s as any).score_breakdown.mode}</span>
                          </>
                        )}
                      </div>
                      <p className="text-2xs text-gray-400">{getScoreLabel(s.score)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Défis tab ────────────────────────────────────────────────────
  if (activeTab === "defis") {
    const today = new Date().toISOString().split("T")[0];

    const { data: userHorsesForDefis } = await supabase
      .from("horses")
      .select("id, name")
      .eq("user_id", authUser.id);
    const userHorseIds = (userHorsesForDefis || []).map((h) => h.id);
    const firstHorseId = userHorseIds[0] ?? null;

    const [{ data: challenges }, { data: myParticipations }] = await Promise.all([
      supabase
        .from("challenges")
        .select("*")
        .gte("end_date", today)
        .order("start_date", { ascending: true }),
      supabase
        .from("challenge_participants")
        .select("challenge_id, status")
        .eq("user_id", authUser.id),
    ]);

    const participationMap: Record<string, { status: string }> = {};
    (myParticipations || []).forEach((p) => {
      participationMap[p.challenge_id] = { status: p.status };
    });

    // Fetch sessions in broadest challenge date range for progress computation
    const earliestStart = (challenges || []).reduce(
      (min, c) => (c.start_date < min ? c.start_date : min),
      today
    );

    const { data: challengeSessions } = userHorseIds.length
      ? await supabase
          .from("training_sessions")
          .select("horse_id, date, type")
          .in("horse_id", userHorseIds)
          .gte("date", earliestStart)
          .lte("date", today)
      : { data: [] };

    const challengesWithProgress = (challenges || []).map((challenge) => {
      const inRange = (challengeSessions || []).filter((s) => {
        const d = s.date.slice(0, 10);
        return d >= challenge.start_date && d <= challenge.end_date;
      });

      let progress = 0;
      if (challenge.type === "volume" || challenge.type === "collectif") {
        progress = inRange.length;
      } else if (challenge.type === "discipline" && challenge.discipline_type) {
        progress = inRange.filter((s) => s.type === challenge.discipline_type).length;
      } else if (challenge.type === "regularite") {
        const weekCounts: Record<string, number> = {};
        inRange.forEach((s) => {
          const d = new Date(s.date.slice(0, 10));
          const key = `${d.getFullYear()}-W${String(getISOWeek(d)).padStart(2, "0")}`;
          weekCounts[key] = (weekCounts[key] ?? 0) + 1;
        });
        progress = Object.values(weekCounts).filter((c) => c >= 3).length;
      }

      return {
        ...challenge,
        progress,
        participation: participationMap[challenge.id] ?? null,
      };
    });

    return (
      <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-orange" />
          <h1 className="text-2xl font-black text-black">Communauté</h1>
        </div>
        <CommunauteTabs activeTab="defis" />
        <DefisTab challenges={challengesWithProgress} userHorseId={firstHorseId} />
      </div>
    );
  }

  // ─── Feed tab (default) ──────────────────────────────────────────
  const { data: myHorses } = await supabase
    .from("horses")
    .select("ecurie")
    .eq("user_id", authUser.id);

  const userEcuries = Array.from(
    new Set((myHorses || []).map((h) => h.ecurie).filter(Boolean))
  ) as string[];

  if (userEcuries.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-orange" />
          <h1 className="text-2xl font-black text-black">Communauté</h1>
        </div>
        <CommunauteTabs activeTab="feed" />
        <div className="card text-center py-12">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange to-orange/60 flex items-center justify-center mx-auto mb-4 shadow-orange">
            <Users className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-lg font-bold text-black mb-2">Rejoignez une écurie</h2>
          <p className="text-sm text-gray-400 max-w-sm mx-auto mb-5">
            Renseignez le nom de votre écurie sur la fiche de votre cheval pour voir l&apos;activité des autres pensionnaires.
          </p>
          <Link href="/horses/new" className="btn-primary inline-flex">Ajouter un cheval</Link>
        </div>
      </div>
    );
  }

  const { data: ecurieHorses } = await supabase
    .from("horses")
    .select("*")
    .in("ecurie", userEcuries)
    .limit(50);

  const ecurieHorseIds = (ecurieHorses || []).map((h) => h.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const horseById: Record<string, any> = {};
  (ecurieHorses || []).forEach((h) => { horseById[h.id] = h; });

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

  const reactionCountsMap: Record<string, Record<string, number>> = {};
  (allReactions || []).forEach((r) => {
    const key = `${r.item_type}:${r.item_id}`;
    if (!reactionCountsMap[key]) reactionCountsMap[key] = {};
    const t = (r.reaction_type as string) || "like";
    reactionCountsMap[key][t] = (reactionCountsMap[key][t] || 0) + 1;
  });

  const myReactionMap: Record<string, string> = {};
  (myReactions || []).forEach((r) => {
    const key = `${r.item_type}:${r.item_id}`;
    myReactionMap[key] = (r.reaction_type as string) || "like";
  });

  const latestScoreByHorse: Record<string, number> = {};
  (recentScores || []).forEach((s) => {
    if (!latestScoreByHorse[s.horse_id]) latestScoreByHorse[s.horse_id] = s.score;
  });

  const feed: FeedItem[] = [
    ...(recentSessions || []).map((s) => ({ date: s.date, type: "session" as const, data: s, horse: horseById[s.horse_id] })),
    ...(recentCompetitions || []).map((c) => ({ date: c.date, type: "competition" as const, data: c, horse: horseById[c.horse_id] })),
  ]
    .filter((item) => item.horse)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 25);

  const feedItemIds = feed.map((item) => item.data.id);
  const { data: allComments } = feedItemIds.length
    ? await supabase.from("feed_comments").select("*").in("item_id", feedItemIds).order("created_at", { ascending: true })
    : { data: [] };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const commentsByItem: Record<string, any[]> = {};
  (allComments || []).forEach((c) => {
    if (!commentsByItem[c.item_id]) commentsByItem[c.item_id] = [];
    commentsByItem[c.item_id].push(c);
  });

  const rankedHorses = [...(ecurieHorses || [])].sort(
    (a, b) => (latestScoreByHorse[b.id] ?? 0) - (latestScoreByHorse[a.id] ?? 0)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-orange" />
        <div>
          <h1 className="text-2xl font-black text-black">Communauté</h1>
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

      <CommunauteTabs activeTab="feed" />

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
