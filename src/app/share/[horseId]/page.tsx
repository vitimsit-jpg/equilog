import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatDate, getScoreLabel, getScoreColor, TRAINING_TYPE_LABELS } from "@/lib/utils";
import HorseIndexGauge from "@/components/horse-index/HorseIndexGauge";
import { Trophy, Dumbbell, Heart, Calendar } from "lucide-react";

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
  ] = await Promise.all([
    supabase
      .from("horse_scores")
      .select("*")
      .eq("horse_id", horse.id)
      .order("computed_at", { ascending: false })
      .limit(1),
    supabase
      .from("competitions")
      .select("*")
      .eq("horse_id", horse.id)
      .order("date", { ascending: false })
      .limit(5),
    supabase
      .from("training_sessions")
      .select("*")
      .eq("horse_id", horse.id)
      .order("date", { ascending: false })
      .limit(10),
  ]);

  const currentScore = scores?.[0] ?? null;
  const totalSessions = recentSessions?.length ?? 0;
  const avgIntensity = totalSessions > 0
    ? (recentSessions!.reduce((s, t) => s + t.intensity, 0) / totalSessions).toFixed(1)
    : null;

  const age = horse.birth_year ? new Date().getFullYear() - horse.birth_year : null;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center">
            <span className="text-white font-black text-xs">E</span>
          </div>
          <span className="font-black text-black text-base tracking-tight">EQUILOG</span>
        </div>
        <a
          href="/register"
          className="text-xs font-semibold text-orange hover:underline"
        >
          Créer mon compte
        </a>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
        {/* Horse identity */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-black text-white font-black text-2xl flex items-center justify-center flex-shrink-0">
              {horse.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-black">{horse.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {[horse.breed, horse.discipline, age ? `${age} ans` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {horse.ecurie && (
                <p className="text-xs text-gray-400 mt-1">
                  Écurie : {horse.ecurie}
                  {horse.region && ` · ${horse.region}`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Horse Index */}
        {currentScore && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              Horse Index
            </p>
            <div className="flex items-center gap-6">
              <HorseIndexGauge score={currentScore.score} size="md" />
              <div className="flex-1 space-y-2">
                <div>
                  <p className="text-3xl font-black text-black">{currentScore.score}</p>
                  <p className="text-sm font-semibold" style={{ color: getScoreColor(currentScore.score) }}>
                    {getScoreLabel(currentScore.score)}
                  </p>
                </div>
                {(currentScore.percentile_category || currentScore.percentile_region) && (
                  <div className="space-y-1 pt-1">
                    {currentScore.percentile_category && horse.discipline && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">{horse.discipline}</span>
                        <span className="font-bold text-black">
                          Top {Math.round(100 - currentScore.percentile_category)}%
                        </span>
                      </div>
                    )}
                    {currentScore.percentile_region && horse.region && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">{horse.region}</span>
                        <span className="font-bold text-black">
                          Top {Math.round(100 - currentScore.percentile_region)}%
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-2xs text-gray-400">
                  Calculé le {formatDate(currentScore.computed_at)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Activity stats */}
        {totalSessions > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Dumbbell className="h-4 w-4 text-gray-400" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Activité récente
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-2xl font-black text-black">{totalSessions}</p>
                <p className="text-xs text-gray-400">séances (10 dernières)</p>
              </div>
              {avgIntensity && (
                <div>
                  <p className="text-2xl font-black text-black">{avgIntensity}<span className="text-base font-normal text-gray-400">/5</span></p>
                  <p className="text-xs text-gray-400">intensité moyenne</p>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              {(recentSessions || []).slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-gray-300" />
                    <span className="text-xs text-gray-600">{TRAINING_TYPE_LABELS[s.type]}</span>
                    <span className="text-xs text-gray-400">{s.duration_min}min</span>
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

        {/* Competitions */}
        {(competitions || []).length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-4 w-4 text-gray-400" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Palmarès récent
              </p>
            </div>
            <div className="space-y-2">
              {(competitions || []).map((c) => (
                <div key={c.id} className="flex items-start justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-sm font-semibold text-black truncate">{c.event_name}</p>
                    <p className="text-xs text-gray-400">
                      {c.discipline} {c.level} · {formatDate(c.date)}
                      {c.location ? ` · ${c.location}` : ""}
                    </p>
                  </div>
                  {c.result_rank && c.total_riders && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-black text-black">
                        {c.result_rank}<span className="text-xs font-normal text-gray-400">/{c.total_riders}</span>
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="bg-black rounded-2xl p-6 text-center">
          <p className="text-white font-black text-lg mb-1">Suivez votre cheval sur Equilog</p>
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
