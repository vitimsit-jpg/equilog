import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import HorseIndexGauge from "@/components/horse-index/HorseIndexGauge";
import ScoreBreakdownComponent from "@/components/horse-index/ScoreBreakdown";
import ScoreHistory from "@/components/horse-index/ScoreHistory";
import { formatDate } from "@/lib/utils";
import PremiumNudge from "@/components/ui/PremiumNudge";
import AvatarUpload from "@/components/horse/AvatarUpload";
import UpgradeBanner from "@/components/ui/UpgradeBanner";
import ExportPDFButton from "@/components/horse/ExportPDFButton";

interface Props {
  params: { id: string };
}

export default async function HorsePage({ params }: Props) {
  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return notFound();

  const { data: horse } = await supabase
    .from("horses")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", authUser.id)
    .single();

  if (!horse) return notFound();

  const { data: userProfile } = await supabase
    .from("users")
    .select("plan, user_type")
    .eq("id", authUser.id)
    .single();

  const [{ data: scores }, { data: latestInsight }] = await Promise.all([
    supabase
      .from("horse_scores")
      .select("*")
      .eq("horse_id", horse.id)
      .order("computed_at", { ascending: false })
      .limit(90),
    supabase
      .from("ai_insights")
      .select("*")
      .eq("horse_id", horse.id)
      .eq("type", "weekly")
      .order("generated_at", { ascending: false })
      .limit(1)
      .single(),
  ]);

  const plan = userProfile?.plan ?? "starter";
  const currentScore = scores?.[0] ?? null;
  const breakdown = currentScore?.score_breakdown;

  // HI-08/HI-10 : statut du cheval
  const hiStatus = (horse as unknown as { horse_index_status?: string }).horse_index_status ?? "incomplet";
  const modeChangedAt = (horse as unknown as { horse_index_mode_changed_at?: string }).horse_index_mode_changed_at;
  const calibrageDaysIn = modeChangedAt
    ? Math.floor((Date.now() - new Date(modeChangedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  let parsedInsight: {
    summary?: string;
    insights?: string[];
    alerts?: string[];
    recommendations?: string[];
  } = {};
  try {
    if (latestInsight?.content) parsedInsight = JSON.parse(latestInsight.content);
  } catch {}

  if (plan === "starter") {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in">
        <UpgradeBanner feature="Horse Index & IA" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex justify-end">
        <ExportPDFButton horseId={horse.id} horseName={horse.name} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Horse Index card */}
        <div className="card lg:col-span-1 flex flex-col items-center gap-5">
          <div className="w-full flex items-center justify-between">
            <h2 className="font-bold text-black text-sm uppercase tracking-wide">
              Horse Index
            </h2>
            {currentScore && (
              <span className="text-2xs text-gray-400">
                {formatDate(currentScore.computed_at)}
              </span>
            )}
          </div>

          {currentScore && hiStatus !== "incomplet" ? (
            <>
              <HorseIndexGauge score={currentScore.score} size="lg" />

              {/* Score · Mode + calibrage badge */}
              {breakdown?.version === 2 && breakdown.mode && (
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-black text-black">{currentScore.score}</span>
                    <span className="text-gray-300 font-light">·</span>
                    <span className="text-sm font-mono font-bold text-orange">{breakdown.mode}</span>
                  </div>
                  {hiStatus === "calibrage" && calibrageDaysIn !== null && (
                    <span className="text-2xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      En calibrage J+{calibrageDaysIn}/30
                    </span>
                  )}
                </div>
              )}

              {(currentScore.percentile_region || currentScore.percentile_category) && (
                <div className="w-full p-3 rounded-xl bg-beige space-y-1.5">
                  {currentScore.percentile_category && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">{horse.discipline}</span>
                      <span className="font-bold text-black">
                        Top {Math.round(100 - currentScore.percentile_category)}%
                      </span>
                    </div>
                  )}
                  {currentScore.percentile_region && horse.region && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">{horse.region}</span>
                      <span className="font-bold text-black">
                        Top {Math.round(100 - currentScore.percentile_region)}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* HI-08 — Mode Incomplet : neutre, jamais alarmant */
            <div className="text-center py-6 space-y-2">
              <div className="text-5xl font-black text-gray-300 mb-1">—</div>
              <p className="text-xs text-gray-400">Données insuffisantes</p>
              <p className="text-2xs text-gray-400 max-w-[170px] mx-auto leading-relaxed">
                Ajoutez une note pour {horse.name} pour recalculer son score
              </p>
            </div>
          )}

          {/* Avatar upload */}
          <div className="w-full pt-2 border-t border-gray-100 flex items-center gap-3">
            <AvatarUpload
              horseId={horse.id}
              horseName={horse.name}
              currentAvatarUrl={(horse as any).avatar_url ?? null}
            />
            <div>
              <p className="text-xs font-semibold text-black">Photo du cheval</p>
              <p className="text-2xs text-gray-400">Cliquer pour modifier</p>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {breakdown && (
            <div className="card">
              <h2 className="font-bold text-black text-sm mb-4">
                Détail du score
              </h2>
              <ScoreBreakdownComponent
                breakdown={breakdown}
                horseId={horse.id}
                scores={scores ?? undefined}
              />
            </div>
          )}

          {scores && scores.length > 1 && (
            <div className="card">
              <h2 className="font-bold text-black text-sm mb-3">
                Évolution sur 90 jours
              </h2>
              <ScoreHistory scores={scores} />
            </div>
          )}
        </div>
      </div>

      {/* Premium nudge */}
      <PremiumNudge
        userPlan={userProfile?.plan ?? "starter"}
        userType={userProfile?.user_type ?? null}
        context="ai_insights"
      />

      {/* AI Insight */}
      {parsedInsight.summary && (
        <div className="card bg-gradient-to-br from-orange-light to-white border border-orange/10">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange text-white text-xs font-black flex items-center justify-center flex-shrink-0 shadow-orange">
              IA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-orange uppercase tracking-wide mb-2">
                Analyse IA —{" "}
                {latestInsight?.generated_at &&
                  formatDate(latestInsight.generated_at)}
              </p>
              <p className="text-sm text-gray-700 leading-relaxed mb-3">
                {parsedInsight.summary}
              </p>

              {parsedInsight.alerts && parsedInsight.alerts.length > 0 && (
                <div className="mb-3">
                  {parsedInsight.alerts.map((alert, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-xs text-danger bg-red-50 p-2 rounded-lg mb-1"
                    >
                      <span className="font-bold">⚠</span>
                      <span>{alert}</span>
                    </div>
                  ))}
                </div>
              )}

              {parsedInsight.insights && parsedInsight.insights.length > 0 && (
                <ul className="space-y-1.5 mb-3">
                  {parsedInsight.insights.map((insight, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="text-orange font-bold mt-0.5">→</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              )}

              {parsedInsight.recommendations &&
                parsedInsight.recommendations.length > 0 && (
                  <div>
                    <p className="text-2xs font-bold uppercase tracking-wide text-gray-400 mb-1.5">
                      Recommandations
                    </p>
                    {parsedInsight.recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-xs text-gray-700 bg-beige p-2 rounded-lg mb-1"
                      >
                        <span className="font-bold text-success">✓</span>
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
