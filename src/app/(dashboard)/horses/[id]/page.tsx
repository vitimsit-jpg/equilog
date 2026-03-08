import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Heart, Dumbbell, Trophy, Wallet } from "lucide-react";
import HorseIndexGauge from "@/components/horse-index/HorseIndexGauge";
import ScoreBreakdownComponent from "@/components/horse-index/ScoreBreakdown";
import ScoreHistory from "@/components/horse-index/ScoreHistory";
import { formatDate } from "@/lib/utils";
import RecalculateButton from "@/components/horse-index/RecalculateButton";
import ShareButton from "@/components/horse/ShareButton";

interface Props {
  params: { id: string };
}

export default async function HorsePage({ params }: Props) {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return notFound();

  const { data: horse } = await supabase
    .from("horses")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", authUser.id)
    .single();

  if (!horse) return notFound();

  const [
    { data: scores },
    { data: latestInsight },
  ] = await Promise.all([
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

  const currentScore = scores?.[0] ?? null;
  const breakdown = currentScore?.score_breakdown;

  const quickLinks = [
    { href: `health`, icon: Heart, label: "Carnet de santé", color: "text-red-500" },
    { href: `training`, icon: Dumbbell, label: "Journal de travail", color: "text-blue-500" },
    { href: `competitions`, icon: Trophy, label: "Concours", color: "text-yellow-500" },
    { href: `budget`, icon: Wallet, label: "Budget", color: "text-green-500" },
  ];

  let parsedInsight: { summary?: string; insights?: string[]; alerts?: string[]; recommendations?: string[] } = {};
  try {
    if (latestInsight?.content) parsedInsight = JSON.parse(latestInsight.content);
  } catch {}

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="btn-ghost p-2">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-black">{horse.name}</h1>
            <p className="text-sm text-gray-400">
              {horse.breed && `${horse.breed} · `}
              {horse.discipline && `${horse.discipline} · `}
              {horse.birth_year && `Né en ${horse.birth_year}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {horse.share_horse_index && (
            <ShareButton horseId={horse.id} horseName={horse.name} />
          )}
          <RecalculateButton horseId={horse.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Horse Index card */}
        <div className="card lg:col-span-1 flex flex-col items-center gap-5">
          <div className="w-full flex items-center justify-between">
            <h2 className="font-bold text-black text-sm uppercase tracking-wide">Horse Index</h2>
            {currentScore && (
              <span className="text-2xs text-gray-400">
                {formatDate(currentScore.computed_at)}
              </span>
            )}
          </div>

          {currentScore ? (
            <>
              <HorseIndexGauge score={currentScore.score} size="lg" />

              {/* Ranking */}
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
            <div className="text-center py-6">
              <div className="text-5xl font-black text-gray-200 mb-2">—</div>
              <p className="text-xs text-gray-400 max-w-[160px] mx-auto">
                Score calculé après 14 jours de données
              </p>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Score breakdown */}
          {breakdown && (
            <div className="card">
              <h2 className="font-bold text-black text-sm mb-4">Détail du score</h2>
              <ScoreBreakdownComponent breakdown={breakdown} />
            </div>
          )}

          {/* Score history */}
          {scores && scores.length > 1 && (
            <div className="card">
              <h2 className="font-bold text-black text-sm mb-3">Évolution sur 90 jours</h2>
              <ScoreHistory scores={scores} />
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={`/horses/${horse.id}/${link.href}`}
            className="card-hover flex items-center gap-3 p-4"
          >
            <link.icon className={`h-5 w-5 ${link.color}`} />
            <span className="text-sm font-semibold text-black">{link.label}</span>
          </Link>
        ))}
      </div>

      {/* AI Insight */}
      {parsedInsight.summary && (
        <div className="card border-l-4 border-orange">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange text-white text-xs font-black flex items-center justify-center flex-shrink-0">
              IA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-orange uppercase tracking-wide mb-2">
                Analyse IA — {latestInsight?.generated_at && formatDate(latestInsight.generated_at)}
              </p>
              <p className="text-sm text-gray-700 leading-relaxed mb-3">{parsedInsight.summary}</p>

              {parsedInsight.alerts && parsedInsight.alerts.length > 0 && (
                <div className="mb-3">
                  {parsedInsight.alerts.map((alert, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-danger bg-red-50 p-2 rounded-lg mb-1">
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

              {parsedInsight.recommendations && parsedInsight.recommendations.length > 0 && (
                <div>
                  <p className="text-2xs font-bold uppercase tracking-wide text-gray-400 mb-1.5">Recommandations</p>
                  {parsedInsight.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-gray-700 bg-beige p-2 rounded-lg mb-1">
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
