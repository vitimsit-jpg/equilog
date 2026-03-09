import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Dumbbell, Trophy, TrendingUp, Users, Medal } from "lucide-react";
import { formatDate, getScoreColor, HEALTH_TYPE_LABELS } from "@/lib/utils";
import Badge from "@/components/ui/Badge";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FeedItem = { date: string; type: "session" | "competition" | "score"; data: any; horse: any };

const TRAINING_TYPE_LABELS: Record<string, string> = {
  dressage: "Dressage", saut: "Saut", endurance: "Endurance", cso: "CSO",
  cross: "Cross", travail_a_pied: "Travail à pied", longe: "Longe",
  galop: "Galop", plat: "Plat", autre: "Séance",
};

export default async function CommunautePage() {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { data: userProfile } = await supabase
    .from("users")
    .select("user_type")
    .eq("id", authUser.id)
    .single();

  const userType = userProfile?.user_type || "loisir";
  const isCompetitor = ["competition", "pro", "gerant_cavalier"].includes(userType);

  // Get user's horses to find their ecurie
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
          <h1 className="text-2xl font-black text-black">Communauté</h1>
          <p className="text-sm text-gray-400 mt-0.5">L&apos;activité de votre écurie</p>
        </div>
        <div className="card text-center py-12">
          <div className="w-16 h-16 rounded-full bg-beige flex items-center justify-center mx-auto mb-4">
            <Users className="h-7 w-7 text-gray-300" />
          </div>
          <h2 className="text-lg font-bold text-black mb-2">Rejoignez une écurie</h2>
          <p className="text-sm text-gray-400 max-w-sm mx-auto mb-4">
            Renseignez le nom de votre écurie sur la fiche de votre cheval pour voir l&apos;activité des autres chevaux pensionnaires.
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
    .neq("user_id", authUser.id)
    .limit(50);

  const ecurieHorseIds = (ecurieHorses || []).map((h) => h.id);
  const horseById: Record<string, typeof ecurieHorses[0]> = {};
  (ecurieHorses || []).forEach((h) => { horseById[h.id] = h; });

  // Fetch recent activity
  const [
    { data: recentSessions },
    { data: recentCompetitions },
    { data: recentScores },
  ] = await Promise.all([
    ecurieHorseIds.length
      ? supabase
          .from("training_sessions")
          .select("*")
          .in("horse_id", ecurieHorseIds)
          .order("date", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] }),
    ecurieHorseIds.length
      ? supabase
          .from("competitions")
          .select("*")
          .in("horse_id", ecurieHorseIds)
          .order("date", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] }),
    ecurieHorseIds.length
      ? supabase
          .from("horse_scores")
          .select("*")
          .in("horse_id", ecurieHorseIds)
          .order("computed_at", { ascending: false })
          .limit(ecurieHorseIds.length * 2)
      : Promise.resolve({ data: [] }),
  ]);

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

  // Rankings
  const rankedHorses = [...(ecurieHorses || [])].sort(
    (a, b) => (latestScoreByHorse[b.id] ?? 0) - (latestScoreByHorse[a.id] ?? 0)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-black">Communauté</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          L&apos;activité de {userEcuries[0]}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feed — left/main column */}
        <div className={`space-y-3 ${isCompetitor ? "lg:col-span-2" : "lg:col-span-3"}`}>
          <h2 className="font-bold text-black flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-orange" />
            Fil d&apos;activité
          </h2>

          {feed.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-sm text-gray-400">
                Aucune activité récente dans l&apos;écurie.<br />
                Les chevaux doivent activer le partage Horse Index dans leur fiche.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {feed.map((item, idx) => (
                <div key={idx} className="card flex items-start gap-3 py-3">
                  {/* Horse avatar */}
                  <div className="w-8 h-8 rounded-full bg-black text-white font-black text-sm flex items-center justify-center flex-shrink-0">
                    {item.horse.name[0].toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    {item.type === "session" && (
                      <>
                        <p className="text-sm font-semibold text-black">
                          {item.horse.name}
                          <span className="font-normal text-gray-500">
                            {" "}a travaillé · {TRAINING_TYPE_LABELS[item.data.type] || item.data.type}
                          </span>
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-400">
                            <Dumbbell className="h-3 w-3 inline mr-1" />
                            {item.data.duration_min}min
                          </span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div
                                key={i}
                                className={`w-1.5 h-2.5 rounded-full ${i < item.data.intensity ? "bg-orange" : "bg-gray-200"}`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-gray-400">{formatDate(item.date)}</span>
                        </div>
                        {item.data.notes && (
                          <p className="text-xs text-gray-500 mt-1 italic">&ldquo;{item.data.notes}&rdquo;</p>
                        )}
                      </>
                    )}

                    {item.type === "competition" && (
                      <>
                        <p className="text-sm font-semibold text-black">
                          {item.horse.name}
                          <span className="font-normal text-gray-500"> en concours · {item.data.event_name}</span>
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-400">
                            <Trophy className="h-3 w-3 inline mr-1" />
                            {item.data.discipline} {item.data.level}
                          </span>
                          {item.data.result_rank && item.data.total_riders && (
                            <Badge variant={item.data.result_rank <= 3 ? "orange" : "gray"}>
                              {item.data.result_rank}/{item.data.total_riders}
                            </Badge>
                          )}
                          <span className="text-xs text-gray-400">{formatDate(item.date)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rankings — right column (compétiteurs only) */}
        {isCompetitor && (
          <div className="space-y-3">
            <h2 className="font-bold text-black flex items-center gap-2">
              <Medal className="h-4 w-4 text-orange" />
              Classement écurie
            </h2>
            <div className="card">
              {rankedHorses.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">
                  Aucun classement disponible.<br />Activez le partage Horse Index.
                </p>
              ) : (
                <div className="space-y-2">
                  {rankedHorses.map((horse, idx) => {
                    const score = latestScoreByHorse[horse.id];
                    return (
                      <div key={horse.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black w-5 ${idx === 0 ? "text-yellow-500" : idx === 1 ? "text-gray-400" : idx === 2 ? "text-orange-400" : "text-gray-300"}`}>
                            {idx + 1}
                          </span>
                          <div className="w-6 h-6 rounded-full bg-black text-white font-black text-xs flex items-center justify-center">
                            {horse.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-black">{horse.name}</p>
                            <p className="text-2xs text-gray-400">{horse.discipline || "—"}</p>
                          </div>
                        </div>
                        {score !== undefined ? (
                          <p className="text-base font-black" style={{ color: getScoreColor(score) }}>{score}</p>
                        ) : (
                          <p className="text-xs text-gray-300">—</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
