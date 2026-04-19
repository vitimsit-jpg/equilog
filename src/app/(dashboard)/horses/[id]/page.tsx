import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import HorseIndexGauge from "@/components/horse-index/HorseIndexGauge";
import ScoreBreakdownComponent from "@/components/horse-index/ScoreBreakdown";
import ScoreHistory from "@/components/horse-index/ScoreHistory";
import CalibrationBadge from "@/components/horse-index/CalibrationBadge";
import { formatDate } from "@/lib/utils";
import { differenceInDays, startOfDay, parseISO } from "date-fns";
import PremiumNudge from "@/components/ui/PremiumNudge";
import AvatarUpload from "@/components/horse/AvatarUpload";
import HorseEditModal from "@/components/horse/HorseEditModal";
import DeleteHorseButton from "@/components/horse/DeleteHorseButton";
import UpgradeBanner from "@/components/ui/UpgradeBanner";
import ExportPDFButton from "@/components/horse/ExportPDFButton";
import StreakBadge from "@/components/training/StreakBadge";
import BadgesDisplay from "@/components/horse/BadgesDisplay";
import ModeHistoryTimeline from "@/components/horse/ModeHistoryTimeline";
import FamilleWidget from "@/components/horse/FamilleWidget";
import FirstRideButton from "@/components/horse/FirstRideButton";
import { computeStreak, getStreakTarget } from "@/lib/streaks";
import { computeEarnedBadgeKeys } from "@/lib/badges";
import type { Horse, HorseIndexMode, HorseModeHistory } from "@/lib/supabase/types";

const MODE_LABELS: Record<HorseIndexMode, string> = {
  IC:  "Compétition",
  IE:  "Équilibre",
  IP:  "Rééducation",
  IR:  "Convalescence",
  IS:  "Retraite",
  ICr: "Croissance",
};

const CONDITIONS_VIE_LABELS: Record<string, string> = {
  box: "Boxe",
  paddock: "Paddock",
  pre: "Pré",
  box_paddock: "Boxe + paddock",
  boxe_paddock_individuel: "Boxe + paddock individuel",
  boxe_pre_collectif: "Boxe + pré collectif",
  paddock_individuel: "Paddock individuel",
  pre_collectif: "Pré collectif",
};

const SEXE_LABELS: Record<string, string> = {
  hongre: "Hongre",
  jument: "Jument",
  etalon: "Étalon",
};

interface Props {
  params: { id: string };
}

export default async function HorsePage({ params }: Props) {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return notFound();

  let horse: Horse | null = null;
  let isOwner = false;

  const { data: ownedHorse } = await supabase
    .from("horses")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", authUser.id)
    .maybeSingle();

  if (ownedHorse) {
    horse = ownedHorse;
    isOwner = true;
  } else {
    const { data: shareData } = await supabase
      .from("horse_shares")
      .select("*, horse:horses(*)")
      .eq("horse_id", params.id)
      .eq("shared_with_user_id", authUser.id)
      .eq("status", "active")
      .maybeSingle();
    if (shareData) horse = shareData.horse as unknown as Horse | null;
  }

  if (!horse) return notFound();

  const { data: userProfile } = await supabase
    .from("users")
    .select("plan, profile_type, user_type")
    .eq("id", authUser.id)
    .single();

  const [{ data: scores }, { data: latestInsight }, { data: allSessions }, { data: allCompetitions }, { data: allHealth }, { data: modeHistory }] = await Promise.all([
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
    supabase
      .from("training_sessions")
      .select("date, type")
      .eq("horse_id", horse.id)
      .is("deleted_at", null)
      .order("date", { ascending: false }),
    supabase
      .from("competitions")
      .select("date, result_rank, total_riders, level")
      .eq("horse_id", horse.id),
    supabase
      .from("health_records")
      .select("id")
      .eq("horse_id", horse.id),
    supabase
      .from("horse_mode_history")
      .select("*")
      .eq("horse_id", horse.id)
      .order("changed_at", { ascending: false })
      .limit(10),
  ]);

  const plan = userProfile?.plan ?? "starter";
  const currentScore = scores?.[0] ?? null;
  const breakdown = currentScore?.score_breakdown;

  // BUG 15 — Déduplication côté serveur de l'historique des modes (en cas de doublons en DB)
  const seenModeKeys = new Set<string>();
  const dedupedModeHistory = (modeHistory ?? []).filter((entry) => {
    const day = entry.changed_at ? entry.changed_at.slice(0, 10) : "";
    const key = `${entry.mode_from}|${entry.mode_to}|${day}`;
    if (seenModeKeys.has(key)) return false;
    seenModeKeys.add(key);
    return true;
  });

  const hiStatus = (horse as any).horse_index_status ?? "incomplet";
  const modeChangedAt = (horse as any).horse_index_mode_changed_at;
  const horseMode = (horse as any).horse_index_mode as HorseIndexMode | null;
  // ICr (poulain) nécessite 180j de calibrage vs 30j pour les autres modes
  const calibrageWindow = horseMode === "ICr" ? 180 : 30;
  const calibrageDaysIn = modeChangedAt
    ? differenceInDays(startOfDay(new Date()), startOfDay(parseISO(modeChangedAt)))
    : null;

  let parsedInsight: {
    summary?: string;
    insights?: string[];
    alerts?: string[];
    recommendations?: string[];
  } = {};
  try {
    if (latestInsight?.content) parsedInsight = JSON.parse(latestInsight.content);
  } catch (e) {
    console.error("Failed to parse AI insight:", e);
  }

  const isStarter = plan === "starter";

  const currentYear = new Date().getFullYear();
  const age = horse.birth_year ? currentYear - horse.birth_year : null;

  // Streak & badges
  const streak = computeStreak(
    (allSessions || []).map((s) => s.date),
    (horse as any).horse_index_mode ?? null
  );
  const streakTarget = getStreakTarget((horse as any).horse_index_mode ?? null);
  const hasPodium = (allCompetitions || []).some((c) => c.result_rank && c.total_riders && c.result_rank <= 3);
  const hasWinner = (allCompetitions || []).some((c) => c.result_rank === 1);
  const compsByYear: Record<string, number> = {};
  (allCompetitions || []).forEach((c) => {
    const year = c.date?.slice(0, 4) ?? "unknown";
    compsByYear[year] = (compsByYear[year] ?? 0) + 1;
  });
  const maxSameYearCompetitions = Math.max(0, ...Object.values(compsByYear));
  const hasAmateurLevel = (allCompetitions || []).some(
    (c) => (c as any).level && ["Amateur 1", "Amateur 2", "Amateur 3"].includes((c as any).level)
  );
  const isCompleteProfile = !!(
    horse.name && horse.breed && horse.birth_year &&
    horse.region && (horse as any).horse_index_mode &&
    horse.discipline && (horse as any).avatar_url
  );
  const earnedBadgeKeys = computeEarnedBadgeKeys({
    totalSessions: (allSessions || []).length,
    totalCompetitions: (allCompetitions || []).length,
    totalHealthRecords: (allHealth || []).length,
    streak,
    hasPodium,
    hasWinner,
    hasHorseIndex: !!(horse as any).horse_index_mode,
    sessionTypes: (allSessions || []).map((s) => (s as any).type).filter(Boolean),
    hasAmateurLevel,
    maxSameYearCompetitions,
    horseCreatedAt: (horse as any).created_at ?? null,
    isCompleteProfile,
  });
  const horseSexe = (horse as any).sexe as string | null;
  const conditionsVie = (horse as any).conditions_vie as string | null;
  const assurance = (horse as any).assurance as string | null;
  const maladiesChroniques = (horse as any).maladies_chroniques as string | null;

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">

      {/* 4. Carte Profil du cheval — toujours visible */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-black text-sm">Profil du cheval</h2>
          {isOwner && (
            <div className="flex items-center gap-1">
              <HorseEditModal horse={horse as any} compact />
              <DeleteHorseButton horseId={horse.id} horseName={horse.name} />
            </div>
          )}
        </div>

        <div className="flex items-start gap-4">
          {/* Photo */}
          <div className="flex-shrink-0">
            {isOwner ? (
              <AvatarUpload
                horseId={horse.id}
                horseName={horse.name}
                currentAvatarUrl={(horse as any).avatar_url ?? null}
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-beige flex items-center justify-center text-2xl font-bold text-gray-400">
                {horse.name[0]}
              </div>
            )}
          </div>

          {/* Données profil */}
          <div className="flex-1 min-w-0 space-y-2">
            <p className="font-bold text-black text-base leading-tight">{horse.name}</p>

            {/* Race · Sexe · Âge */}
            {(horse.breed || horseSexe || age) && (
              <p className="text-sm text-gray-600">
                {[
                  horse.breed,
                  horseSexe ? SEXE_LABELS[horseSexe] : null,
                  age ? `${age} ans` : null,
                ].filter(Boolean).join(" · ")}
              </p>
            )}

            {/* Mode de vie */}
            {horseMode && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold text-orange bg-orange-light px-1.5 py-0.5 rounded">
                  {horseMode}
                </span>
                <span className="text-xs text-gray-600">{MODE_LABELS[horseMode]}</span>
              </div>
            )}

            {/* Conditions de vie */}
            {conditionsVie && (
              <p className="text-xs text-gray-500">
                🏠 {CONDITIONS_VIE_LABELS[conditionsVie] ?? conditionsVie}
              </p>
            )}

            {/* Écurie */}
            {horse.ecurie && (
              <p className="text-xs text-gray-500">
                📍 {horse.ecurie}{horse.region ? ` · ${horse.region}` : ""}
              </p>
            )}

            {/* Assurance */}
            <p className="text-xs text-gray-500">
              🛡 {assurance ? assurance : "Non assurée"}
            </p>

            {/* Maladies chroniques */}
            {maladiesChroniques && (
              <p className="text-xs text-gray-500">
                ⚕️ {maladiesChroniques}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* P2 — Bouton "Je commence à monter" pour les ICr */}
      {horseMode === "ICr" && (
        <FirstRideButton horseId={horse.id} horseName={horse.name} />
      )}

      {isStarter ? (
        <UpgradeBanner feature="Horse Index & IA" />
      ) : (
      <>
      <div className="flex justify-end">
        <ExportPDFButton horseId={horse.id} horseName={horse.name} />
      </div>

      {/* 3. Carte Horse Index */}
      <div className="card flex flex-col items-center gap-5">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-black text-sm uppercase tracking-wide">Horse Index</h2>
            <details className="relative group">
              <summary className="cursor-pointer list-none w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-xs font-bold flex items-center justify-center hover:bg-gray-200 transition-colors select-none">?</summary>
              <div className="absolute left-0 top-6 z-10 w-64 p-3 bg-white border border-gray-100 rounded-xl shadow-lg text-2xs text-gray-500 leading-relaxed">
                <p className="font-bold text-black text-xs mb-1">Comment ce score est calculé ?</p>
                <p>Le Horse Index est un score sur 100 combinant trois piliers pondérés selon le mode de vie du cheval :</p>
                <ul className="mt-1 space-y-0.5">
                  <li>❤️ <strong>Santé</strong> — soins à jour, alertes vét, suivi praticiens</li>
                  <li>🌿 <strong>Bien-être</strong> — ressenti en séance, équilibre repos/travail</li>
                  <li>🏇 <strong>Activité</strong> — régularité et intensité adaptées au mode</li>
                </ul>
                <p className="mt-1.5 text-gray-400">Recalculé à chaque nouvelle saisie.</p>
              </div>
            </details>
          </div>
          {currentScore && (
            <span className="text-2xs text-gray-400">{formatDate(currentScore.computed_at)}</span>
          )}
        </div>

        {currentScore && hiStatus !== "incomplet" ? (
          <>
            <HorseIndexGauge score={currentScore.score} size="lg" mode={(horse as any).horse_index_mode ?? null} />

            {breakdown?.version === 2 && breakdown.mode && (
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black text-black">{currentScore.score}</span>
                  <span className="text-gray-300 font-light">·</span>
                  <span className="text-sm font-mono font-bold text-orange">{breakdown.mode}</span>
                </div>
                {/* APCU-03 — CalibrationBadge */}
                {calibrageDaysIn !== null && calibrageDaysIn < calibrageWindow && (hiStatus === "calibrage" || ["IS", "IR", "ICr"].includes((horse as any).horse_index_mode ?? "")) && (
                  <CalibrationBadge daysIn={calibrageDaysIn} window={calibrageWindow} />
                )}
              </div>
            )}

            {(currentScore.percentile_region || currentScore.percentile_category) && (
              <div className="w-full p-3 rounded-xl bg-beige space-y-1.5">
                {currentScore.percentile_category && currentScore.percentile_category < 100 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Discipline</span>
                    <span className="font-bold text-black">
                      Top {Math.max(1, Math.round(100 - currentScore.percentile_category))}%
                    </span>
                  </div>
                )}
                {currentScore.percentile_region && currentScore.percentile_region < 100 && horse.region && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{horse.region}</span>
                    <span className="font-bold text-black">
                      Top {Math.max(1, Math.round(100 - currentScore.percentile_region))}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        ) : horseMode === "IS" ? (
          <div className="text-center py-6 space-y-2">
            <div className="text-4xl mb-1">🌿</div>
            <p className="text-sm font-bold text-gray-600">Mode retraite</p>
            <p className="text-2xs text-gray-400 max-w-[180px] mx-auto leading-relaxed">
              Le Horse Index n&apos;est pas calculé pour les chevaux en retraite.
            </p>
          </div>
        ) : (
          <div className="text-center py-6 space-y-2">
            <div className="text-5xl font-black text-gray-300 mb-1">—</div>
            <p className="text-xs text-gray-400">Données insuffisantes</p>
            <p className="text-2xs text-gray-400 max-w-[170px] mx-auto leading-relaxed">
              Ajoutez une note pour {horse.name} pour recalculer son score
            </p>
          </div>
        )}
      </div>

      {/* 5. Streak */}
      {(streak.current > 0 || streak.best > 0) && (
        <div className="card px-4 py-3">
          <p className="text-xs font-semibold text-gray-400 mb-2">Régularité</p>
          <StreakBadge current={streak.current} best={streak.best} target={streakTarget} />
        </div>
      )}

      {/* 6. Badges */}
      {earnedBadgeKeys.length > 0 && (
        <div className="card px-4 py-4">
          <p className="text-xs font-semibold text-gray-400 mb-3">Badges</p>
          <BadgesDisplay earnedKeys={earnedBadgeKeys} />
        </div>
      )}

      {/* TRAV P2 — Widget mère / poulain */}
      <FamilleWidget
        horseId={horse.id}
        mereHorseId={(horse as any).mere_horse_id ?? null}
        poulainHorseId={(horse as any).poulain_horse_id ?? null}
      />

      {/* TRAV-23 — Historique des modes */}
      {dedupedModeHistory.length > 0 && (
        <ModeHistoryTimeline
          history={dedupedModeHistory as HorseModeHistory[]}
          currentMode={horseMode}
        />
      )}

      {/* 7. Carte Détail du score */}
      {breakdown && (
        <div className="card">
          <h2 className="font-bold text-black text-sm mb-4">Détail du score</h2>
          <ScoreBreakdownComponent
            breakdown={breakdown}
            horseId={horse.id}
            scores={scores ?? undefined}
          />
        </div>
      )}

      {/* 6. Carte Évolution sur 90 jours */}
      {scores && scores.length > 1 && (
        <div className="card">
          <h2 className="font-bold text-black text-sm mb-3">Évolution sur 90 jours</h2>
          <ScoreHistory scores={scores} />
        </div>
      )}

      <PremiumNudge
        userPlan={userProfile?.plan ?? "starter"}
        userType={userProfile?.profile_type ?? userProfile?.user_type ?? null}
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
                {latestInsight?.generated_at && formatDate(latestInsight.generated_at)}
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
                  <p className="text-2xs font-bold uppercase tracking-wide text-gray-400 mb-1.5">
                    Recommandations
                  </p>
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
      </>
      )}
    </div>
  );
}
