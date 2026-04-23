import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatDate, getScoreLabel, getScoreColor, TRAINING_TYPE_LABELS } from "@/lib/utils";
import HorseIndexGauge from "@/components/horse-index/HorseIndexGauge";
import ShareButtons from "@/components/share/ShareButtons";
import { Trophy, Dumbbell, Calendar, Medal } from "lucide-react";

interface Props {
  params: { horseId: string };
}

export default async function PublicHorseProfilePage({ params }: Props) {
  const supabase = createClient();

  const { data: horse } = await supabase
    .from("horses")
    .select("*")
    .eq("id", params.horseId)
    .eq("share_horse_index", true)
    .single();

  if (!horse) return notFound();

  const [
    { data: scores },
    { data: competitions },
    { data: recentSessions },
    { count: rawSessionCount },
  ] = await Promise.all([
    supabase.from("horse_scores").select("*").eq("horse_id", horse.id).order("computed_at", { ascending: false }).limit(1),
    supabase.from("competitions").select("*").eq("horse_id", horse.id).order("date", { ascending: false }).limit(50),
    supabase.from("training_sessions").select("*").eq("horse_id", horse.id).is("deleted_at", null).order("date", { ascending: false }).limit(30),
    supabase.from("training_sessions").select("id", { count: "exact", head: true }).eq("horse_id", horse.id).is("deleted_at", null),
  ]);

  const currentScore = scores?.[0] ?? null;
  const age = horse.birth_year ? new Date().getFullYear() - horse.birth_year : null;

  // Stats
  const sessionCount = rawSessionCount ?? (recentSessions?.length ?? 0);
  const last30Sessions = (recentSessions || []).slice(0, 30);
  const avgIntensity = last30Sessions.length > 0
    ? (last30Sessions.reduce((s, t) => s + t.intensity, 0) / last30Sessions.length).toFixed(1)
    : null;
  const totalMinutesLast30 = last30Sessions.reduce((s, t) => s + (t.duration_min || 0), 0);

  // Competition stats
  const allComps = competitions || [];
  const compsWithRank = allComps.filter((c) => c.result_rank != null && c.total_riders != null);
  const podiums = compsWithRank.filter((c) => (c.result_rank ?? Infinity) <= 3).length;
  const bestRank = compsWithRank.length > 0 ? Math.min(...compsWithRank.map((c) => c.result_rank ?? Infinity)) : null;

  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://equilog-i3nr-vitimsit-jpgs-projects.vercel.app"}/share/${params.horseId}`;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center">
            <span className="text-white font-black text-xs">E</span>
          </div>
          <span className="font-black text-black text-base tracking-tight">EQUISTRA</span>
        </div>
        <a href="/register" className="text-xs font-semibold text-orange hover:underline">
          Créer mon compte
        </a>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">

        {/* Horse identity */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-black text-white font-black text-2xl flex items-center justify-center flex-shrink-0">
              {horse.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-black">{horse.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {[horse.breed, horse.discipline, age ? `${age} ans` : null].filter(Boolean).join(" · ")}
              </p>
              {horse.ecurie && (
                <p className="text-xs text-gray-400 mt-1">
                  {horse.ecurie}{horse.region && ` · ${horse.region}`}
                </p>
              )}
            </div>
          </div>
          {/* Share buttons */}
          <div className="pt-3 border-t border-gray-50">
            <ShareButtons horseName={horse.name} score={currentScore?.score ?? null} url={shareUrl} />
          </div>
        </div>

        {/* Horse Index */}
        {currentScore && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Horse Index</p>
            <div className="flex items-center gap-6 mb-4">
              <HorseIndexGauge score={currentScore.score} size="md" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-3xl font-black text-black">{currentScore.score}</p>
                  {currentScore.score_breakdown?.mode && (
                    <>
                      <span className="text-gray-400 font-light text-xl">·</span>
                      <span className="text-base font-mono font-bold text-orange">{currentScore.score_breakdown.mode}</span>
                    </>
                  )}
                </div>
                <p className="text-sm font-semibold" style={{ color: getScoreColor(currentScore.score) }}>
                  {getScoreLabel(currentScore.score)}
                </p>
                {(currentScore.percentile_category || currentScore.percentile_region) && (
                  <div className="space-y-1 pt-1">
                    {currentScore.percentile_category && horse.discipline && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">{horse.discipline}</span>
                        <span className="font-bold text-black">Top {Math.round(100 - currentScore.percentile_category)}%</span>
                      </div>
                    )}
                    {currentScore.percentile_region && horse.region && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">{horse.region}</span>
                        <span className="font-bold text-black">Top {Math.round(100 - currentScore.percentile_region)}%</span>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-2xs text-gray-400">Calculé le {formatDate(currentScore.computed_at)}</p>
              </div>
            </div>

            {/* Score breakdown */}
            {currentScore.score_breakdown && (
              <div className="grid grid-cols-4 gap-2 pt-4 border-t border-gray-50">
                {[
                  { label: "Régularité", key: "regularite", max: 25 },
                  { label: "Progression", key: "progression", max: 25 },
                  { label: "Santé", key: "sante", max: 20 },
                  { label: "Récup.", key: "recuperation", max: 20 },
                ].map((item) => {
                  const val = (currentScore.score_breakdown as unknown as Record<string, number> | null)?.[item.key] ?? 0;
                  const pct = Math.round((val / item.max) * 100);
                  return (
                    <div key={item.key} className="text-center">
                      <div className="relative w-10 h-10 mx-auto mb-1">
                        <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#f0ede8" strokeWidth="3" />
                          <circle
                            cx="18" cy="18" r="14" fill="none"
                            stroke="#E87E35" strokeWidth="3"
                            strokeDasharray={`${pct * 0.88} 88`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-2xs font-black text-black">{val}</span>
                      </div>
                      <p className="text-2xs text-gray-400">{item.label}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Key stats */}
        {(sessionCount > 0 || allComps.length > 0) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Statistiques clés</p>
            <div className="grid grid-cols-2 gap-4">
              {sessionCount > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-beige flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xl font-black text-black">{sessionCount}</p>
                    <p className="text-xs text-gray-400">séances enregistrées</p>
                  </div>
                </div>
              )}
              {totalMinutesLast30 > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-beige flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xl font-black text-black">{Math.round(totalMinutesLast30 / 60)}h</p>
                    <p className="text-xs text-gray-400">travaillées (30j)</p>
                  </div>
                </div>
              )}
              {allComps.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-beige flex items-center justify-center flex-shrink-0">
                    <Trophy className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xl font-black text-black">{allComps.length}</p>
                    <p className="text-xs text-gray-400">concours</p>
                  </div>
                </div>
              )}
              {podiums > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-beige flex items-center justify-center flex-shrink-0">
                    <Medal className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xl font-black text-black">{podiums}</p>
                    <p className="text-xs text-gray-400">podiums{bestRank === 1 ? ` · ${allComps.filter(c => c.result_rank === 1).length} victoire${allComps.filter(c => c.result_rank === 1).length > 1 ? "s" : ""}` : ""}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Palmarès complet */}
        {allComps.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-4 w-4 text-gray-400" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Palmarès</p>
            </div>
            <div className="space-y-2">
              {allComps.map((c) => {
                const isPodium = c.result_rank && c.result_rank <= 3;
                const medalColor = c.result_rank === 1 ? "text-yellow-500" : c.result_rank === 2 ? "text-gray-400" : "text-orange-400";
                return (
                  <div
                    key={c.id}
                    className={`flex items-start justify-between py-2 px-3 rounded-xl border ${
                      isPodium ? "border-orange/30 bg-orange-light" : "border-gray-50"
                    }`}
                  >
                    <div className="flex items-start gap-2 flex-1 min-w-0 pr-2">
                      {isPodium && (
                        <span className={`text-base flex-shrink-0 ${medalColor}`}>
                          {c.result_rank === 1 ? "🥇" : c.result_rank === 2 ? "🥈" : "🥉"}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-black truncate">{c.event_name}</p>
                        <p className="text-xs text-gray-400">
                          {c.discipline} {c.level} · {formatDate(c.date)}
                          {c.location ? ` · ${c.location}` : ""}
                        </p>
                      </div>
                    </div>
                    {c.result_rank && c.total_riders && (
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-black ${isPodium ? "text-orange" : "text-black"}`}>
                          {c.result_rank}<span className="text-xs font-normal text-gray-400">/{c.total_riders}</span>
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Activité récente */}
        {last30Sessions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-gray-400" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Activité récente</p>
              </div>
              {avgIntensity && (
                <p className="text-xs text-gray-400">intensité moy. <span className="font-bold text-black">{avgIntensity}/5</span></p>
              )}
            </div>
            <div className="space-y-1.5">
              {last30Sessions.slice(0, 8).map((s) => (
                <div key={s.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-600">{TRAINING_TYPE_LABELS[s.type] || s.type}</span>
                    <span className="text-xs text-gray-400">{s.duration_min}min</span>
                    <span className="text-xs text-gray-400">{formatDate(s.date)}</span>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className={`w-1.5 h-3 rounded-full ${i < s.intensity ? "bg-orange" : "bg-gray-100"}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="bg-black rounded-2xl p-6 text-center">
          <p className="text-white font-black text-lg mb-1">Suivez votre cheval sur Equistra</p>
          <p className="text-gray-400 text-sm mb-4">
            Carnet de santé, journal de travail, Horse Index et insights IA.
          </p>
          <a
            href="/register"
            className="inline-block bg-orange text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-orange/90 transition-colors"
          >
            Créer un compte gratuit
          </a>
        </div>
      </div>
    </div>
  );
}
