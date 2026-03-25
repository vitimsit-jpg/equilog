import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import TrainingTabs from "@/components/training/TrainingTabs";
import TrainingPlanCard from "@/components/training/TrainingPlanCard";
import PdfDownloadButton from "@/components/pdf/PdfDownloadButton";
import FeaturesV2Placeholders from "@/components/training/FeaturesV2Placeholders";
import StreakBadge from "@/components/training/StreakBadge";
import BadgesDisplay from "@/components/horse/BadgesDisplay";
import { computeStreak, getStreakTarget } from "@/lib/streaks";
import { computeEarnedBadgeKeys } from "@/lib/badges";
import Link from "next/link";

interface Props {
  params: { id: string };
}

export default async function TrainingPage({ params }: Props) {
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

  const yearStart = `${new Date().getFullYear()}-01-01`;
  const today = new Date().toISOString().split("T")[0];

  const [
    { data: sessions },
    { data: plannedSessions },
    { data: yearHealth },
    { data: yearCompetitions },
    { data: yearBudget },
    { data: allCompetitionsForBadges },
    { data: allHealthForBadges },
  ] = await Promise.all([
    supabase
      .from("training_sessions")
      .select("*")
      .eq("horse_id", horse.id)
      .order("date", { ascending: false }),
    supabase
      .from("training_planned_sessions")
      .select("*")
      .eq("horse_id", horse.id)
      .order("date", { ascending: true }),
    supabase
      .from("health_records")
      .select("id, type, date, cost")
      .eq("horse_id", horse.id)
      .gte("date", yearStart),
    supabase
      .from("competitions")
      .select("id, date, event_name, discipline, result_rank, total_riders")
      .eq("horse_id", horse.id)
      .gte("date", yearStart),
    supabase
      .from("budget_entries")
      .select("id, date, category, amount, description")
      .eq("horse_id", horse.id)
      .gte("date", yearStart),
    supabase
      .from("competitions")
      .select("id, date, result_rank, total_riders, level")
      .eq("horse_id", horse.id),
    supabase
      .from("health_records")
      .select("id")
      .eq("horse_id", horse.id),
  ]);

  const { data: activeRehabProtocol } = await supabase
    .from("rehab_protocols")
    .select("*")
    .eq("horse_id", horse.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: allCompetitions } = await supabase
    .from("competitions")
    .select("id, event_name, date")
    .eq("horse_id", horse.id)
    .order("date", { ascending: false })
    .limit(50);

  const [{ data: latestInsight }, { data: latestPlan }] = await Promise.all([
    supabase
      .from("ai_insights")
      .select("*")
      .eq("horse_id", horse.id)
      .eq("type", "weekly")
      .order("generated_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("ai_insights")
      .select("*")
      .eq("horse_id", horse.id)
      .eq("type", "training_plan")
      .order("generated_at", { ascending: false })
      .limit(1)
      .single(),
  ]);

  // Section 6.1 — No mode set: guide user to configure horse index mode
  const horseMode = (horse as any).horse_index_mode ?? null;
  if (!horseMode) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="card flex flex-col items-center text-center gap-5 py-12 px-6">
          <div className="w-16 h-16 rounded-2xl bg-beige flex items-center justify-center text-3xl">🐴</div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-black">Définir le mode de vie</h2>
            <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
              Pour accéder au journal de travail, définissez d&apos;abord le mode de vie de{" "}
              <strong>{horse.name}</strong>. Cela permet à Equistra d&apos;adapter le suivi à sa situation.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm text-left text-xs">
            {[
              { code: "IC",  label: "Compétition",  desc: "Actif en compétition" },
              { code: "IE",  label: "Équilibre",     desc: "Loisir / pratique régulière" },
              { code: "IP",  label: "Rééducation",   desc: "Retour progressif" },
              { code: "IR",  label: "Convalescence", desc: "Blessure, arrêt médical" },
              { code: "IS",  label: "Retraite",      desc: "Très faible activité" },
              { code: "ICr", label: "Croissance",    desc: "Poulain en développement" },
            ].map((m) => (
              <div key={m.code} className="px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50">
                <span className="font-mono font-bold text-orange text-sm">{m.code}</span>
                <span className="text-gray-600 ml-1.5 font-semibold">{m.label}</span>
                <p className="text-gray-400 mt-0.5">{m.desc}</p>
              </div>
            ))}
          </div>
          <Link
            href={`/horses/${horse.id}`}
            className="btn-primary px-6 py-3 text-sm font-bold"
          >
            Configurer le mode de vie →
          </Link>
        </div>
      </div>
    );
  }

  const streak = computeStreak(
    (sessions || []).map((s) => s.date),
    horse.horse_index_mode ?? null
  );
  const streakTarget = getStreakTarget(horse.horse_index_mode ?? null);

  const hasPodium = (allCompetitionsForBadges || []).some(
    (c) => c.result_rank && c.total_riders && c.result_rank <= 3
  );
  const hasWinner = (allCompetitionsForBadges || []).some((c) => c.result_rank === 1);

  // Famille 3 — max competitions in same year
  const compsByYear: Record<string, number> = {};
  (allCompetitionsForBadges || []).forEach((c) => {
    const year = (c as any).date?.slice(0, 4) ?? "unknown";
    compsByYear[year] = (compsByYear[year] ?? 0) + 1;
  });
  const maxSameYearCompetitions = Math.max(0, ...Object.values(compsByYear));
  const hasAmateurLevel = (allCompetitionsForBadges || []).some(
    (c) => (c as any).level && ["Amateur 1", "Amateur 2", "Amateur 3"].includes((c as any).level)
  );

  // Famille 4 — anniversary + complete profile
  const horseCreatedAt = (horse as any).created_at ?? null;
  const isCompleteProfile = !!(
    horse.name && horse.breed && horse.birth_year &&
    horse.region && (horse as any).horse_index_mode &&
    horse.discipline && (horse as any).avatar_url
  );

  const earnedBadgeKeys = computeEarnedBadgeKeys({
    totalSessions: (sessions || []).length,
    totalCompetitions: (allCompetitionsForBadges || []).length,
    totalHealthRecords: (allHealthForBadges || []).length,
    streak,
    hasPodium,
    hasWinner,
    hasHorseIndex: !!horse.horse_index_mode,
    sessionTypes: (sessions || []).map((s) => (s as any).type).filter(Boolean),
    hasAmateurLevel,
    maxSameYearCompetitions,
    horseCreatedAt,
    isCompleteProfile,
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-black">Journal de travail</h2>
        <div className="flex items-center gap-2">
          <PdfDownloadButton
            type="rapport"
            horse={horse}
            sessions={sessions || []}
          />
          <PdfDownloadButton
            type="bilan"
            horse={horse}
            sessions={sessions || []}
            records={yearHealth || []}
            competitions={yearCompetitions || []}
            budgetEntries={yearBudget || []}
          />
        </div>
      </div>

      {/* Streak */}
      {(streak.current > 0 || streak.best > 0) && (
        <div className="card px-4 py-3">
          <p className="text-xs font-semibold text-gray-400 mb-2">Régularité</p>
          <StreakBadge current={streak.current} best={streak.best} target={streakTarget} />
        </div>
      )}

      {/* Badges */}
      {earnedBadgeKeys.length > 0 && (
        <div className="card px-4 py-4">
          <p className="text-xs font-semibold text-gray-400 mb-3">Badges</p>
          <BadgesDisplay earnedKeys={earnedBadgeKeys} />
        </div>
      )}

      {/* AI Training Plan card */}
      <TrainingPlanCard horseId={horse.id} latestPlan={latestPlan ?? null} />

      {/* Main tab system */}
      <TrainingTabs
        horseId={horse.id}
        horseName={horse.name}
        horseBirthYear={horse.birth_year}
        sessions={sessions || []}
        plannedSessions={plannedSessions || []}
        latestInsight={latestInsight ?? null}
        horseMode={horse.horse_index_mode}
        nextCompetition={
          (yearCompetitions || [])
            .filter((c) => c.date >= today)
            .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
        }
        healthRecords={(yearHealth || []).map((h) => ({ id: h.id, type: h.type, date: h.date }))}
        activeRehabProtocol={activeRehabProtocol ?? null}
        competitions={allCompetitions ?? null}
      />

      {/* V2 feature placeholders */}
      <FeaturesV2Placeholders />
    </div>
  );
}
