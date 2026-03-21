import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Heart,
  Dumbbell,
  TrendingUp,
  Users,
  Trophy,
  Zap,
  Star,
  Target,
} from "lucide-react";
import {
  formatDate,
  daysUntil,
  HEALTH_TYPE_LABELS,
  TRAINING_TYPE_LABELS,
  getScoreColor,
  DISCIPLINE_LABELS,
} from "@/lib/utils";
import HorseAvatar from "@/components/ui/HorseAvatar";
import {
  differenceInDays,
  startOfWeek,
  endOfWeek,
  subDays,
  format,
  addDays,
} from "date-fns";
import { fr } from "date-fns/locale";
import WeatherWidget from "@/components/weather/WeatherWidget";
import OnboardingChecklist from "@/components/dashboard/OnboardingChecklist";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import PaddockToggle from "@/components/dashboard/PaddockToggle";
import ProgrammeSemaine from "@/components/dashboard/ProgrammeSemaine";
import DashboardModeToggle from "@/components/dashboard/DashboardModeToggle";
import TodoEcurie from "@/components/dashboard/TodoEcurie";
import AlerteCheval from "@/components/horses/AlerteCheval";
import CoursAujourdhui from "@/components/dashboard/CoursAujourdhui";
import NotifierProprietaire from "@/components/horses/NotifierProprietaire";
import AgendaSemaine from "@/components/dashboard/AgendaSemaine";
import SuggestionIA from "@/components/dashboard/SuggestionIA";
import FeedMiniDashboard from "@/components/dashboard/FeedMiniDashboard";
import DashboardQuickAdd from "@/components/dashboard/DashboardQuickAdd";
import type { EcurieTodo, HorseAlert, CoachStudent, CoachPlannedSession } from "@/lib/supabase/types";

type BlockKey =
  | "header"
  | "chevaux"
  | "programme"
  | "concours"
  | "plan_ia"
  | "notes_seance"
  | "sessions"
  | "ecurie"
  | "todo"
  | "alertes"
  | "coach"
  | "agenda"
  | "suggestion"
  | "feed";

function getBlockOrder(hour: number): BlockKey[] {
  if (hour >= 6 && hour < 11) {
    return ["alertes", "chevaux", "todo", "programme", "agenda", "suggestion", "notes_seance", "concours", "plan_ia", "coach", "sessions", "feed", "ecurie"];
  } else if (hour >= 11 && hour < 15) {
    return ["alertes", "chevaux", "todo", "programme", "agenda", "suggestion", "notes_seance", "plan_ia", "coach", "concours", "sessions", "feed", "ecurie"];
  } else if (hour >= 15 && hour < 21) {
    return ["alertes", "programme", "agenda", "chevaux", "suggestion", "notes_seance", "todo", "coach", "plan_ia", "concours", "sessions", "ecurie"];
  } else {
    return ["alertes", "chevaux", "todo", "programme", "agenda", "notes_seance", "plan_ia", "sessions", "ecurie"];
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { mode?: string };
}) {
  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { data: userProfile } = await supabase
    .from("users")
    .select("user_type, profile_type, module_coach, module_gerant, name")
    .eq("id", authUser.id)
    .single();

  // Redirect to onboarding if not yet completed
  if (!userProfile?.profile_type && !userProfile?.user_type) redirect("/onboarding");

  // Resolve effective profile (new system preferred, legacy fallback)
  const profileType = userProfile?.profile_type || "loisir";
  const userType = userProfile?.user_type || "loisir";
  const moduleCoach = userProfile?.module_coach ?? false;
  const moduleGerant = userProfile?.module_gerant ?? false;

  // P6 toggle: only shown when user has both module_gerant and has own horses
  const isP6 = moduleGerant && (profileType === "pro" || profileType === "gerant" || moduleCoach);
  const dashMode: "cavalier" | "gerant" =
    isP6 && searchParams?.mode === "gerant" ? "gerant" : "cavalier";

  const { data: horses } = await supabase
    .from("horses")
    .select("*")
    .eq("user_id", authUser.id);

  const horseIds = (horses || []).map((h) => h.id);
  const userEcuries = Array.from(
    new Set((horses || []).map((h) => h.ecurie).filter(Boolean))
  ) as string[];
  const fetchCompetitions =
    ["competition", "pro"].includes(profileType) ||
    ["competition", "pro", "gerant_cavalier"].includes(userType);
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split("T")[0];

  // Week bounds for week sessions query
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");

  // Today's date for daily logs
  const todayStr = format(now, "yyyy-MM-dd");

  // 90 days from now for upcoming competitions
  const ninetyDaysFromNow = format(addDays(now, 90), "yyyy-MM-dd");

  const [
    { data: latestScores },
    { data: upcomingHealth },
    { data: recentSessions },
    { data: recentInsights },
    { data: upcomingCompetitions },
    { count: sessionsCount30d },
    { count: healthRecordsCount },
    { data: weekSessions },
    { data: todayLogs },
  ] = await Promise.all([
    supabase
      .from("horse_scores")
      .select("*")
      .in("horse_id", horseIds.length ? horseIds : ["none"])
      .order("computed_at", { ascending: false }),
    supabase
      .from("health_records")
      .select("*, horses!inner(user_id, name)")
      .eq("horses.user_id", authUser.id)
      .not("next_date", "is", null)
      .order("next_date", { ascending: true })
      .limit(10),
    supabase
      .from("training_sessions")
      .select("*, horses!inner(user_id, name)")
      .eq("horses.user_id", authUser.id)
      .order("date", { ascending: false })
      .limit(5),
    supabase
      .from("ai_insights")
      .select("*, horses!inner(user_id, name)")
      .eq("horses.user_id", authUser.id)
      .eq("type", "weekly")
      .order("generated_at", { ascending: false })
      .limit(3),
    fetchCompetitions
      ? supabase
          .from("competitions")
          .select("*, horses!inner(user_id, name)")
          .eq("horses.user_id", authUser.id)
          .gte("date", todayStr)
          .lte("date", ninetyDaysFromNow)
          .order("date", { ascending: true })
          .limit(3)
      : Promise.resolve({ data: null }),
    horseIds.length
      ? supabase
          .from("training_sessions")
          .select("id", { count: "exact", head: true })
          .in("horse_id", horseIds)
          .gte("date", thirtyDaysAgo)
      : Promise.resolve({ count: 0 }),
    horseIds.length
      ? supabase
          .from("health_records")
          .select("id", { count: "exact", head: true })
          .in("horse_id", horseIds)
      : Promise.resolve({ count: 0 }),
    horseIds.length
      ? supabase
          .from("training_sessions")
          .select("id, horse_id, date, type, intensity, coach_present")
          .in("horse_id", horseIds)
          .gte("date", weekStartStr)
          .lte("date", weekEndStr)
          .order("date", { ascending: true })
      : Promise.resolve({ data: [] }),
    horseIds.length
      ? supabase
          .from("horse_daily_logs")
          .select("horse_id, paddock_checked")
          .in("horse_id", horseIds)
          .eq("date", todayStr)
      : Promise.resolve({ data: [] }),
  ]);

  // Last session per horse (for notes block + >14j message)
  const lastSessionByHorse: Record<string, { date: string; notes: string | null; type: string }> = {};
  if (horseIds.length) {
    const { data: lastSessions } = await supabase
      .from("training_sessions")
      .select("horse_id, date, notes, type")
      .in("horse_id", horseIds)
      .order("date", { ascending: false })
      .limit(horseIds.length * 2);
    (lastSessions || []).forEach((s) => {
      if (!lastSessionByHorse[s.horse_id]) {
        lastSessionByHorse[s.horse_id] = { date: s.date, notes: s.notes, type: s.type };
      }
    });
  }

  // Vérification vaccins FEI — pour profils compétition/pro
  const vaccinsAlerte: { horseName: string; horseId: string; daysToComp: number }[] = [];
  if (fetchCompetitions && horseIds.length) {
    const { data: vaccins } = await supabase
      .from("health_records")
      .select("horse_id, next_date, product_name")
      .in("horse_id", horseIds)
      .eq("type", "vaccin")
      .order("date", { ascending: false });

    // Latest vaccine per horse
    const latestVaccinByHorse: Record<string, { next_date: string | null }> = {};
    (vaccins || []).forEach((v) => {
      if (!latestVaccinByHorse[v.horse_id]) {
        latestVaccinByHorse[v.horse_id] = { next_date: v.next_date };
      }
    });

    // Check horses with competition ≤21 days
    const twentyOneDaysFromNow = format(addDays(now, 21), "yyyy-MM-dd");
    const horsesWithImmComp = (upcomingCompetitions || []).filter(
      (c) => c.date <= twentyOneDaysFromNow && daysUntil(c.date) >= 0
    );

    horsesWithImmComp.forEach((comp) => {
      const horseId = (comp as any).horse_id;
      const vaccin = latestVaccinByHorse[horseId];
      const vaccinOk = vaccin?.next_date && daysUntil(vaccin.next_date) >= 0;
      if (!vaccinOk) {
        const horse = (horses || []).find((h) => h.id === horseId);
        if (horse && !vaccinsAlerte.find((v) => v.horseId === horseId)) {
          vaccinsAlerte.push({
            horseName: horse.name,
            horseId,
            daysToComp: daysUntil(comp.date),
          });
        }
      }
    });
  }

  // Active horse alerts for dashboard
  const horseAlertsMap: Record<string, HorseAlert[]> = {};
  if (horseIds.length) {
    const { data: alertsData } = await supabase
      .from("horse_alerts")
      .select("*")
      .in("horse_id", horseIds)
      .eq("resolved", false)
      .order("created_at", { ascending: false });
    (alertsData || []).forEach((a) => {
      if (!horseAlertsMap[a.horse_id]) horseAlertsMap[a.horse_id] = [];
      horseAlertsMap[a.horse_id].push(a as HorseAlert);
    });
  }

  // Coach students and today sessions
  type SessionWithStudent = CoachPlannedSession & { coach_students: CoachStudent };
  let coachStudents: CoachStudent[] = [];
  let coachTodaySessions: SessionWithStudent[] = [];
  if (moduleCoach) {
    const [{ data: studentsData }, { data: sessionsData }] = await Promise.all([
      supabase.from("coach_students").select("*").eq("coach_id", authUser.id).eq("active", true).order("student_name"),
      supabase.from("coach_planned_sessions").select("*, coach_students(*)").eq("coach_id", authUser.id).eq("date", todayStr).order("time_slot"),
    ]);
    coachStudents = (studentsData as CoachStudent[]) || [];
    coachTodaySessions = (sessionsData as SessionWithStudent[]) || [];
  }

  // Agenda semaine (P3/P4) — 7 days ahead
  const sevenDaysFromNow = format(addDays(now, 7), "yyyy-MM-dd");

  type AgendaItem = { date: string; type: "competition" | "health" | "cours"; label: string; sub?: string; href: string };
  const agendaItems: AgendaItem[] = [];

  if (["pro", "gerant"].includes(profileType) || moduleGerant) {
    // Competitions next 7 days
    (upcomingCompetitions || [])
      .filter((c) => c.date <= sevenDaysFromNow)
      .forEach((c) => {
        const horseName = (c as any).horses?.name;
        agendaItems.push({
          date: c.date,
          type: "competition",
          label: c.event_name,
          sub: horseName ? `${horseName} · ${c.discipline}` : c.discipline,
          href: `/horses/${(c as any).horse_id || horseIds[0]}/competitions`,
        });
      });

    // Health appointments next 7 days
    (upcomingHealth || [])
      .filter((h) => h.next_date && h.next_date >= todayStr && h.next_date <= sevenDaysFromNow)
      .forEach((h) => {
        const horseName = (h as any).horses?.name;
        agendaItems.push({
          date: h.next_date!,
          type: "health",
          label: HEALTH_TYPE_LABELS[h.type],
          sub: horseName || undefined,
          href: `/horses/${(h as any).horse_id || horseIds[0]}/health`,
        });
      });

    // Coach sessions next 7 days
    if (moduleCoach) {
      const { data: weekCoachSessions } = await supabase
        .from("coach_planned_sessions")
        .select("*, coach_students(student_name, horse_name)")
        .eq("coach_id", authUser.id)
        .gte("date", todayStr)
        .lte("date", sevenDaysFromNow)
        .eq("completed", false)
        .order("date");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (weekCoachSessions || []).forEach((s: any) => {
        agendaItems.push({
          date: s.date,
          type: "cours",
          label: s.coach_students?.student_name || "Cours",
          sub: [s.coach_students?.horse_name, s.time_slot].filter(Boolean).join(" · ") || undefined,
          href: "/dashboard",
        });
      });
    }

    agendaItems.sort((a, b) => a.date.localeCompare(b.date));
  }

  let ecurieTodos: EcurieTodo[] = [];
  if (moduleGerant || profileType === "pro") {
    const { data: todosData } = await supabase
      .from("ecurie_todos")
      .select("*")
      .eq("user_id", authUser.id)
      .order("created_at", { ascending: true });
    ecurieTodos = (todosData as EcurieTodo[]) || [];
  }

  const scoresByHorse: Record<string, { score: number; mode: string | null }> = {};
  (latestScores || []).forEach((s) => {
    if (!scoresByHorse[s.horse_id]) {
      scoresByHorse[s.horse_id] = {
        score: s.score,
        mode: (s as any).score_breakdown?.mode ?? null,
      };
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ecurieHorses: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ecurieScores: any[] = [];
  if (userEcuries.length) {
    const [{ data: eh }, { data: es }] = await Promise.all([
      supabase
        .from("horses")
        .select("*")
        .in("ecurie", userEcuries)
        .eq("share_horse_index", true)
        .neq("user_id", authUser.id)
        .limit(20),
      supabase
        .from("horse_scores")
        .select("*")
        .order("computed_at", { ascending: false })
        .limit(200),
    ]);
    ecurieHorses = eh || [];
    ecurieScores = es || [];
  }

  const ecurieScoreByHorse: Record<string, number> = {};
  ecurieScores.forEach((s) => {
    if (!ecurieScoreByHorse[s.horse_id]) ecurieScoreByHorse[s.horse_id] = s.score;
  });

  // Feed communauté (P1, optionnel)
  type DashFeedItem = { id: string; type: "session" | "competition"; horseName: string; label: string; date: string };
  let feedItems: DashFeedItem[] = [];
  if (profileType === "loisir" && userEcuries.length > 0 && ecurieHorses.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const otherEcurieIds = ecurieHorses.map((h: any) => h.id).filter((id: string) => !horseIds.includes(id));
    if (otherEcurieIds.length > 0) {
      const fiveDaysAgo = format(subDays(now, 5), "yyyy-MM-dd");
      const [{ data: feedSessions }, { data: feedComps }] = await Promise.all([
        supabase.from("training_sessions").select("id, horse_id, date, type").in("horse_id", otherEcurieIds).gte("date", fiveDaysAgo).order("date", { ascending: false }).limit(6),
        supabase.from("competitions").select("id, horse_id, date, event_name").in("horse_id", otherEcurieIds).gte("date", fiveDaysAgo).order("date", { ascending: false }).limit(4),
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const horseById: Record<string, any> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ecurieHorses.forEach((h: any) => { horseById[h.id] = h; });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (feedSessions || []).forEach((s: any) => {
        feedItems.push({ id: s.id, type: "session", horseName: horseById[s.horse_id]?.name || "—", label: s.type, date: s.date });
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (feedComps || []).forEach((c: any) => {
        feedItems.push({ id: c.id, type: "competition", horseName: horseById[c.horse_id]?.name || "—", label: c.event_name, date: c.date });
      });
      feedItems.sort((a, b) => b.date.localeCompare(a.date));
      feedItems = feedItems.slice(0, 4);
    }
  }

  const rankedEcurieHorses = [...ecurieHorses].sort(
    (a, b) => (ecurieScoreByHorse[b.id] ?? 0) - (ecurieScoreByHorse[a.id] ?? 0)
  );

  const alerts = (upcomingHealth || []).filter((h) => {
    const days = daysUntil(h.next_date!);
    return days <= 30;
  });
  const overdueRecords = alerts.filter((h) => daysUntil(h.next_date!) < 0);

  // For pro/gérant profile: compute horse status (RAS/soin prévu/soin en retard/en compétition)
  function getHorseStatus(horseId: string): "ras" | "soin_prevu" | "soin_retard" | "en_competition" {
    const isInComp = (upcomingCompetitions || []).some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c) => (c as any).horse_id === horseId && daysUntil(c.date) >= 0 && daysUntil(c.date) <= 7
    );
    if (isInComp) return "en_competition";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overdue = overdueRecords.some((r) => (r as any).horse_id === horseId);
    if (overdue) return "soin_retard";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const soon = alerts.some((r) => (r as any).horse_id === horseId && daysUntil((r as any).next_date) >= 0);
    if (soon) return "soin_prevu";
    return "ras";
  }

  const nextAlert = (upcomingHealth || []).find(
    (h) => h.next_date && daysUntil(h.next_date) >= 0
  );
  const nextAlertDays = nextAlert ? daysUntil(nextAlert.next_date!) : null;

  // Paddock status map
  const paddockStatus: Record<string, boolean> = {};
  (todayLogs || []).forEach((log) => {
    paddockStatus[log.horse_id] = log.paddock_checked ?? false;
  });

  // Alerts within 21 days
  const alerts21Days = (upcomingHealth || []).filter(
    (h) => h.next_date && daysUntil(h.next_date) <= 21
  );

  // Upcoming competition (first one with days >= 0)
  const upcomingComp = (upcomingCompetitions || []).find(
    (c) => daysUntil(c.date) >= 0
  ) ?? null;

  // Latest insight
  const latestInsight = (recentInsights || [])[0] ?? null;

  // Hour for temporal ordering (server-side)
  const hour = now.getHours();
  let blockOrder = getBlockOrder(hour);

  // P2 (competition): ordre fixe prioritaire
  if (profileType === "competition") {
    blockOrder = ["alertes", "chevaux", "programme", "sessions", "concours", "plan_ia", "notes_seance", "coach", "suggestion", "feed", "ecurie"];
  }

  // Prochain concours remonte en position 3 si J≤14 (hors P2 qui a déjà concours bien placé)
  const daysToUpcomingComp = upcomingComp ? daysUntil(upcomingComp.date) : null;
  if (profileType !== "competition" && daysToUpcomingComp !== null && daysToUpcomingComp >= 0 && daysToUpcomingComp <= 14) {
    blockOrder = blockOrder.filter((k) => k !== "concours");
    blockOrder.splice(2, 0, "concours");
  }

  // Quick actions
  const firstHorse = (horses || [])[0];
  const weekStartForSessions = startOfWeek(now, { locale: fr });
  const hasSessionThisWeek = (recentSessions || []).some(
    (s) => new Date(s.date) >= weekStartForSessions
  );
  const latestScoreDate =
    firstHorse && (latestScores || []).find((s) => s.horse_id === firstHorse.id)?.computed_at;
  const scoreIsStale =
    !latestScoreDate || differenceInDays(now, new Date(latestScoreDate)) >= 7;
  const noObjectif = firstHorse && !(firstHorse as any).objectif_saison;

  type QuickAction = {
    label: string;
    sub: string;
    href: string;
    icon: React.ElementType;
    color: string;
    bg: string;
  };
  const quickActions: QuickAction[] = [];

  if (firstHorse && !hasSessionThisWeek) {
    quickActions.push({
      label: "Séance du jour",
      sub: "Aucune séance cette semaine",
      href: `/horses/${firstHorse.id}/training`,
      icon: Dumbbell,
      color: "text-blue-500",
      bg: "bg-blue-50",
    });
  }
  if (overdueRecords.length > 0 && firstHorse) {
    const h = overdueRecords[0] as any;
    quickActions.push({
      label: "Soin en retard",
      sub: `${HEALTH_TYPE_LABELS[(overdueRecords[0] as any).type]} — ${h.horses?.name || ""}`,
      href: `/horses/${(overdueRecords[0] as any).horse_id || firstHorse.id}/health`,
      icon: Heart,
      color: "text-red-500",
      bg: "bg-red-50",
    });
  }
  if (firstHorse && scoreIsStale) {
    quickActions.push({
      label: "Calculer l'index",
      sub: latestScoreDate ? "Mis à jour il y a 7j+" : "Jamais calculé",
      href: `/horses/${firstHorse.id}`,
      icon: Star,
      color: "text-orange",
      bg: "bg-orange-light",
    });
  }
  if (firstHorse && noObjectif) {
    quickActions.push({
      label: "Définir un objectif",
      sub: "Objectif de saison manquant",
      href: `/horses/${firstHorse.id}`,
      icon: Target,
      color: "text-green-600",
      bg: "bg-green-50",
    });
  }

  // ── Build blocks ──────────────────────────────────────────────────────────

  const horseCount = (horses || []).length;

  const headerBlock = (
    <DashboardHeader
      userName={userProfile?.name || authUser.email || ""}
      profileType={profileType}
      moduleCoach={moduleCoach}
      moduleGerant={moduleGerant}
      overdueCount={overdueRecords.length}
      nextHealthDays={nextAlertDays}
      nextHealthType={nextAlert ? HEALTH_TYPE_LABELS[(nextAlert as any).type] : null}
      upcomingCompetition={
        upcomingComp
          ? { event_name: upcomingComp.event_name, date: upcomingComp.date }
          : null
      }
      horsesCount={horseCount}
      quickAddSlot={
        horseCount > 0 ? (
          <DashboardQuickAdd
            horses={(horses || []).map((h) => ({
              id: h.id,
              name: h.name,
              avatar_url: (h as any).avatar_url ?? null,
              horse_index_mode: (h as any).horse_index_mode ?? null,
            }))}
          />
        ) : null
      }
    />
  );

  const chevauxBlock =
    horseCount > 0 ? (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-black">Mes chevaux</h2>
          <Link
            href="/horses/new"
            className="text-xs text-gray-400 hover:text-orange transition-colors font-medium flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </Link>
        </div>

        {/* ── Consolidated summary (2+ horses) ─────────────────────────── */}
        {horseCount >= 2 && (() => {
          const horsesActiveThisWeek = new Set((weekSessions || []).map((s) => s.horse_id)).size;
          const weekSessionCount = (weekSessions || []).length;
          const totalOverdue = overdueRecords.length;
          return (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="stat-card items-center text-center">
                <span className="text-xl font-black text-black">{weekSessionCount}</span>
                <span className="text-2xs text-gray-400">séances</span>
                <span className="text-2xs text-gray-300">cette semaine</span>
              </div>
              <div className="stat-card items-center text-center">
                <span className={`text-xl font-black ${horsesActiveThisWeek === horseCount ? "text-success" : "text-black"}`}>
                  {horsesActiveThisWeek}/{horseCount}
                </span>
                <span className="text-2xs text-gray-400">actifs</span>
                <span className="text-2xs text-gray-300">cette semaine</span>
              </div>
              <div className="stat-card items-center text-center">
                <span className={`text-xl font-black ${totalOverdue > 0 ? "text-danger" : "text-success"}`}>
                  {totalOverdue}
                </span>
                <span className="text-2xs text-gray-400">soin{totalOverdue !== 1 ? "s" : ""}</span>
                <span className="text-2xs text-gray-300">en retard</span>
              </div>
            </div>
          );
        })()}

        {/* 1 horse: full-width horizontal card */}
        {horseCount === 1 && (() => {
          const horse = (horses || [])[0];
          const score = scoresByHorse[horse.id];
          const overdue = overdueRecords.filter((r) => (r as any).horse_id === horse.id).length;
          const avatarUrl = (horse as any).avatar_url;
          const coachNote = (horse as any).coach_note;
          const lastSession = lastSessionByHorse[horse.id];
          const daysSinceSession = lastSession
            ? differenceInDays(now, new Date(lastSession.date))
            : null;
          const showInactiveMsg = daysSinceSession === null || daysSinceSession > 14;
          return (
            <div className="card p-5">
              <div className="flex gap-4">
                <Link
                  href={`/horses/${horse.id}`}
                  className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100"
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt={horse.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                      <span className="text-white font-black text-2xl">{horse.name[0]}</span>
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/horses/${horse.id}`}>
                        <h3 className="font-black text-black text-xl hover:text-orange transition-colors">
                          {horse.name}
                        </h3>
                      </Link>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {[
                          horse.breed,
                          DISCIPLINE_LABELS[horse.discipline ?? ""] || horse.discipline,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                    {score !== undefined && (
                      <div className="flex flex-col items-center bg-gray-50 rounded-xl px-2.5 py-1.5 flex-shrink-0">
                        <div className="flex items-baseline gap-1">
                          <span
                            className="text-xl font-black leading-none"
                            style={{ color: getScoreColor(score.score) }}
                          >
                            {score.score}
                          </span>
                          {score.mode && (
                            <span className="text-xs font-bold text-orange leading-none">{score.mode}</span>
                          )}
                        </div>
                        <span className="text-2xs text-gray-400 leading-none mt-0.5">Index</span>
                      </div>
                    )}
                  </div>
                  {coachNote && (
                    <p className="text-xs text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2 mt-2 border-l-2 border-orange/30">
                      {coachNote}
                    </p>
                  )}
                  {showInactiveMsg && (
                    <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 mt-2">
                      {daysSinceSession === null
                        ? `Comment va ${horse.name} ? Ajoutez une note rapide 🌿`
                        : `Aucune séance depuis ${daysSinceSession}j — comment va ${horse.name} ? 🌿`}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <PaddockToggle
                      horseId={horse.id}
                      initialChecked={paddockStatus[horse.id] ?? false}
                    />
                    {overdue > 0 && (
                      <span className="flex items-center gap-1 text-xs font-bold text-white bg-danger px-2.5 py-1 rounded-full">
                        <Heart className="h-3 w-3" />
                        {overdue} soin{overdue > 1 ? "s" : ""} en retard
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <AlerteCheval
                      horseId={horse.id}
                      horseName={horse.name}
                      initialAlerts={horseAlertsMap[horse.id] ?? []}
                    />
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
                    <Link
                      href={`/horses/${horse.id}/training`}
                      className="text-xs font-semibold text-orange hover:underline"
                    >
                      Logger une séance →
                    </Link>
                    <Link
                      href={`/horses/${horse.id}/health`}
                      className="text-xs text-gray-400 hover:text-black transition-colors"
                    >
                      Santé
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 2 horses: 2-column grid */}
        {horseCount === 2 && (
          <div className="grid grid-cols-2 gap-4">
            {(horses || []).map((horse) => {
              const score = scoresByHorse[horse.id];
              const avatarUrl = (horse as any).avatar_url;
              const overdue = overdueRecords.filter(
                (r) => (r as any).horse_id === horse.id
              ).length;
              return (
                <div key={horse.id} className="card p-4 flex flex-col gap-3">
                  <Link
                    href={`/horses/${horse.id}`}
                    className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-100"
                  >
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt={horse.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                        <span className="text-white font-black text-3xl">{horse.name[0]}</span>
                      </div>
                    )}
                    {score !== undefined && (
                      <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1 flex items-baseline gap-1">
                        <span className="font-black text-sm" style={{ color: getScoreColor(score.score) }}>{score.score}</span>
                        {score.mode && <span className="text-2xs font-bold text-orange">{score.mode}</span>}
                      </div>
                    )}
                    {overdue > 0 && (
                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-danger/90 rounded-lg px-2 py-0.5">
                        <Heart className="h-3 w-3 text-white" />
                        <span className="text-xs font-bold text-white">{overdue}</span>
                      </div>
                    )}
                  </Link>
                  <div>
                    <h3 className="font-black text-black">{horse.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {[horse.breed, horse.discipline].filter(Boolean).join(" · ") || "—"}
                    </p>
                    {/* Activity badge */}
                    {(() => {
                      const ls = lastSessionByHorse[horse.id];
                      const workedToday = (weekSessions || []).some(
                        (s) => s.horse_id === horse.id && s.date === format(now, "yyyy-MM-dd")
                      );
                      const daysSince = ls ? differenceInDays(now, new Date(ls.date)) : null;
                      if (workedToday) return (
                        <span className="inline-flex items-center gap-1 mt-1 text-2xs font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-success">
                          ✓ Travaillé aujourd&apos;hui
                        </span>
                      );
                      if (daysSince !== null) return (
                        <span className={`inline-flex items-center gap-1 mt-1 text-2xs font-semibold px-1.5 py-0.5 rounded-full ${daysSince > 7 ? "bg-red-50 text-danger" : "bg-gray-100 text-gray-500"}`}>
                          {daysSince <= 1 ? "Travaillé hier" : `${daysSince}j sans séance`}
                        </span>
                      );
                      return (
                        <span className="inline-flex items-center gap-1 mt-1 text-2xs font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">
                          Aucune séance
                        </span>
                      );
                    })()}
                    {(profileType === "pro" || moduleGerant) && (() => {
                      const status = getHorseStatus(horse.id);
                      const isConfie = (horse as any).is_confie;
                      const ownerName = (horse as any).owner_name;
                      return (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {isConfie && ownerName && (
                            <span className="text-2xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">
                              Prop. {ownerName}
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 text-2xs font-medium px-1.5 py-0.5 rounded-full ${
                            status === "soin_retard" ? "text-red-600 bg-red-50" :
                            status === "soin_prevu" ? "text-orange bg-orange-light" :
                            status === "en_competition" ? "text-blue-600 bg-blue-50" :
                            "text-green-700 bg-green-50"
                          }`}>
                            <span className={`w-1 h-1 rounded-full inline-block ${
                              status === "soin_retard" ? "bg-red-500" :
                              status === "soin_prevu" ? "bg-orange" :
                              status === "en_competition" ? "bg-blue-500" :
                              "bg-green-500"
                            }`} />
                            {status === "soin_retard" ? "Soin retard" :
                             status === "soin_prevu" ? "Soin prévu" :
                             status === "en_competition" ? "En compétition" :
                             "RAS"}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                  <PaddockToggle
                    horseId={horse.id}
                    initialChecked={paddockStatus[horse.id] ?? false}
                  />
                  <div className="mt-2">
                    <AlerteCheval
                      horseId={horse.id}
                      horseName={horse.name}
                      initialAlerts={horseAlertsMap[horse.id] ?? []}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 3+ horses: compact list (desktop) + mobile carousel */}
        {horseCount >= 3 && (
          <>
            {/* Mobile carousel */}
            <div className="md:hidden -mx-4">
              <div
                className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-3"
                style={{ scrollbarWidth: "none" }}
              >
                {(horses || []).map((horse) => {
                  const score = scoresByHorse[horse.id];
                  const avatarUrl = (horse as any).avatar_url;
                  const overdue = overdueRecords.filter(
                    (r) => (r as any).horse_id === horse.id
                  ).length;
                  return (
                    <Link
                      key={horse.id}
                      href={`/horses/${horse.id}`}
                      className="relative flex-shrink-0 w-[56vw] rounded-2xl overflow-hidden h-[160px] flex flex-col justify-end snap-start shadow-card"
                    >
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarUrl}
                          alt={horse.name}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      {score !== undefined && (
                        <div className="absolute top-2 right-2 bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1 flex items-baseline gap-1">
                          <span className="font-black text-sm" style={{ color: getScoreColor(score.score) }}>{score.score}</span>
                          {score.mode && <span className="text-2xs font-bold text-orange">{score.mode}</span>}
                        </div>
                      )}
                      {overdue > 0 && (
                        <div className="absolute top-2 left-2 bg-danger/90 rounded-full px-2 py-0.5">
                          <span className="text-xs font-bold text-white">{overdue}⚠</span>
                        </div>
                      )}
                      <div className="relative z-10 px-3 py-3">
                        <h3 className="text-sm font-black text-white">{horse.name}</h3>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Desktop: compact card list */}
            <div className="hidden md:block card divide-y divide-gray-50">
              {(horses || []).map((horse) => {
                const score = scoresByHorse[horse.id];
                const avatarUrl = (horse as any).avatar_url;
                const overdue = overdueRecords.filter(
                  (r) => (r as any).horse_id === horse.id
                ).length;
                const ls = lastSessionByHorse[horse.id];
                const workedToday = (weekSessions || []).some(
                  (s) => s.horse_id === horse.id && s.date === format(now, "yyyy-MM-dd")
                );
                const daysSince = ls ? differenceInDays(now, new Date(ls.date)) : null;
                return (
                  <div key={horse.id} className="flex items-center gap-3 px-4 py-3">
                    <Link
                      href={`/horses/${horse.id}`}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <HorseAvatar name={horse.name} photoUrl={avatarUrl} size="sm" rounded="lg" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-black truncate">{horse.name}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {[horse.breed, horse.discipline].filter(Boolean).join(" · ") || "—"}
                        </p>
                        <span className={`inline-flex items-center gap-1 mt-0.5 text-2xs font-semibold px-1.5 py-0.5 rounded-full ${
                          workedToday ? "bg-green-50 text-success" :
                          daysSince !== null && daysSince > 7 ? "bg-red-50 text-danger" :
                          daysSince !== null ? "bg-gray-100 text-gray-500" :
                          "bg-gray-100 text-gray-400"
                        }`}>
                          {workedToday ? "✓ Aujourd'hui" :
                           daysSince === 0 ? "Hier" :
                           daysSince !== null ? `${daysSince}j sans séance` :
                           "Jamais"}
                        </span>
                        {(profileType === "pro" || moduleGerant) && (() => {
                          const status = getHorseStatus(horse.id);
                          const isConfie = (horse as any).is_confie;
                          const ownerName = (horse as any).owner_name;
                          return (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {isConfie && ownerName && (
                                <span className="text-2xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full">
                                  Prop. {ownerName}
                                </span>
                              )}
                              <span className={`inline-flex items-center gap-1 text-2xs font-medium px-1.5 py-0.5 rounded-full ${
                                status === "soin_retard" ? "text-red-600 bg-red-50" :
                                status === "soin_prevu" ? "text-orange bg-orange-light" :
                                status === "en_competition" ? "text-blue-600 bg-blue-50" :
                                "text-green-700 bg-green-50"
                              }`}>
                                <span className={`w-1 h-1 rounded-full inline-block ${
                                  status === "soin_retard" ? "bg-red-500" :
                                  status === "soin_prevu" ? "bg-orange" :
                                  status === "en_competition" ? "bg-blue-500" :
                                  "bg-green-500"
                                }`} />
                                {status === "soin_retard" ? "Soin retard" :
                                 status === "soin_prevu" ? "Soin prévu" :
                                 status === "en_competition" ? "En compétition" :
                                 "RAS"}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </Link>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {overdue > 0 && (
                        <span className="flex items-center gap-1 text-xs font-bold text-white bg-danger px-2 py-0.5 rounded-full">
                          <Heart className="h-3 w-3" />
                          {overdue}
                        </span>
                      )}
                      {score !== undefined && (
                        <span className="flex items-baseline gap-0.5">
                          <span
                            className="text-lg font-black"
                            style={{ color: getScoreColor(score.score) }}
                          >
                            {score.score}
                          </span>
                          {score.mode && <span className="text-xs font-bold text-orange">{score.mode}</span>}
                        </span>
                      )}
                      <PaddockToggle
                        horseId={horse.id}
                        initialChecked={paddockStatus[horse.id] ?? false}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Add horse link */}
        {horseCount >= 1 && (
          <Link
            href="/horses/new"
            className="flex items-center justify-center gap-2 py-2.5 border border-dashed border-gray-200 rounded-xl text-xs font-semibold text-gray-400 hover:border-orange hover:text-orange transition-colors mt-3"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter un cheval
          </Link>
        )}
      </div>
    ) : null;

  const programmeBlock =
    horseCount > 0 ? (
      <ProgrammeSemaine
        horses={(horses || []).map((h) => ({ id: h.id, name: h.name }))}
        sessions={(weekSessions || []) as {
          id: string;
          horse_id: string;
          date: string;
          type: string;
          intensity: number;
          coach_present?: boolean | null;
        }[]}
      />
    ) : null;

  const concoursBlock =
    upcomingComp && fetchCompetitions
      ? (() => {
          const daysToComp = daysUntil(upcomingComp.date);
          const horseName = (upcomingComp as any).horses?.name;
          return (
            <div className="card border border-orange/15 bg-orange-light/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange flex items-center justify-center flex-shrink-0">
                    <Trophy className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-orange uppercase tracking-wide mb-0.5">
                      Prochain concours
                    </p>
                    <h3 className="font-black text-black">{upcomingComp.event_name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[
                        horseName,
                        upcomingComp.discipline,
                        formatDate(upcomingComp.date),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
                <div
                  className={`text-2xl font-black flex-shrink-0 ${
                    daysToComp <= 7 ? "text-orange" : "text-black"
                  }`}
                >
                  J-{daysToComp}
                </div>
              </div>
            </div>
          );
        })()
      : null;

  const planIABlock = latestInsight
    ? (() => {
        let parsed: { summary?: string; plan_semaine?: string } = {};
        try {
          parsed = JSON.parse(latestInsight.content);
        } catch {}
        const text = parsed.plan_semaine || parsed.summary;
        if (!text) return null;
        const horseName = (latestInsight as any).horses?.name;
        return (
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-orange flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-black text-sm">Plan IA de la semaine</h2>
                {horseName && <p className="text-xs text-gray-400">{horseName}</p>}
              </div>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{text}</p>
            {horseIds[0] && (
              <Link
                href={`/horses/${horseIds[0]}/training`}
                className="text-xs font-semibold text-orange hover:underline mt-2 block"
              >
                Voir le journal →
              </Link>
            )}
          </div>
        );
      })()
    : null;

  // Notes dernière séance — visible P2/P3, au moins 1 cheval avec notes
  const horsesWithNotes = (horses || []).filter(
    (h) => lastSessionByHorse[h.id]?.notes
  );
  const notesDerniereSeanceBlock =
    horsesWithNotes.length > 0 && ["competition", "pro"].includes(profileType)
      ? (
        <div>
          <h2 className="font-bold text-black mb-3">Notes dernière séance</h2>
          <div className="space-y-2">
            {horsesWithNotes.map((horse) => {
              const last = lastSessionByHorse[horse.id];
              return (
                <div key={horse.id} className="card p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-bold text-black">{horse.name}</p>
                      <p className="text-xs text-gray-400">{last.type} · {formatDate(last.date)}</p>
                    </div>
                    <Link
                      href={`/horses/${horse.id}/training`}
                      className="text-xs text-orange hover:underline flex-shrink-0"
                    >
                      Voir →
                    </Link>
                  </div>
                  <p className="text-sm text-gray-700 italic line-clamp-3">{last.notes}</p>
                </div>
              );
            })}
          </div>
        </div>
      )
      : null;

  // BLOC_SÉANCE — Dernière séance loggée (toutes disciplines confondues)
  const lastLoggedSession = (recentSessions || [])[0] ?? null;
  const sessionsBlock = lastLoggedSession ? (() => {
    const horseName = (lastLoggedSession as any).horses?.name;
    const horseId = (lastLoggedSession as any).horse_id || horseIds[0];
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-gray-400" />
            <h2 className="font-bold text-black text-sm">Dernière séance</h2>
          </div>
          {horseId && (
            <Link href={`/horses/${horseId}/training`} className="text-xs text-orange font-semibold hover:underline">
              Journal →
            </Link>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-black">{horseName || "—"}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {TRAINING_TYPE_LABELS[lastLoggedSession.type] || lastLoggedSession.type}
              {" · "}{lastLoggedSession.duration_min}min
              {" · "}{formatDate(lastLoggedSession.date)}
            </p>
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-4 rounded-full ${i < lastLoggedSession.intensity ? "bg-orange" : "bg-gray-200"}`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  })() : null;

  const ecurieBlock =
    rankedEcurieHorses.length > 0 && userEcuries[0] ? (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <h2 className="font-bold text-black">Mon écurie</h2>
            <span className="text-xs text-gray-400 font-normal">— {userEcuries[0]}</span>
          </div>
          <Link
            href={`/ecurie/${encodeURIComponent(userEcuries[0])}`}
            className="text-xs text-orange font-semibold hover:underline"
          >
            Voir tout →
          </Link>
        </div>
        <div className="space-y-2">
          {rankedEcurieHorses.slice(0, 5).map((horse, idx) => {
            const score = ecurieScoreByHorse[horse.id];
            return (
              <div
                key={horse.id}
                className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-300 w-4">{idx + 1}</span>
                  <HorseAvatar
                    name={horse.name}
                    photoUrl={horse.avatar_url}
                    size="xs"
                    rounded="lg"
                  />
                  <div>
                    <p className="text-sm font-semibold text-black">{horse.name}</p>
                    <p className="text-xs text-gray-400">{horse.discipline || horse.breed || "—"}</p>
                  </div>
                </div>
                {score !== undefined ? (
                  <p className="text-lg font-black" style={{ color: getScoreColor(score) }}>
                    {score}
                  </p>
                ) : (
                  <p className="text-sm text-gray-300 font-bold">—</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    ) : null;

  const alertesBlock = (moduleGerant || profileType === "pro") && overdueRecords.length > 0 ? (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-bold text-black">Alertes urgentes</h2>
        <span className="text-xs font-bold text-white bg-red-500 rounded-full px-1.5 py-0.5 leading-none">
          {overdueRecords.length}
        </span>
      </div>
      <div className="card divide-y divide-gray-50">
        {overdueRecords.slice(0, 5).map((record) => {
          const h = record as any;
          const days = Math.abs(daysUntil(h.next_date));
          return (
            <div key={h.id} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium text-black">{h.horses?.name || "—"}</p>
                <p className="text-xs text-gray-400">{HEALTH_TYPE_LABELS[h.type]}</p>
              </div>
              <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                {days}j de retard
              </span>
            </div>
          );
        })}
      </div>
    </div>
  ) : null;

  const todoBlock = (moduleGerant || profileType === "pro") ? (
    <TodoEcurie initialTodos={ecurieTodos} />
  ) : null;

  const pensionnairesBlock = moduleGerant && rankedEcurieHorses.length > 0 ? (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-black">Mes pensionnaires</h2>
        <span className="text-xs text-gray-400">{rankedEcurieHorses.length} cheval{rankedEcurieHorses.length > 1 ? "x" : ""}</span>
      </div>
      <div className="card divide-y divide-gray-50">
        {rankedEcurieHorses.slice(0, 10).map((horse) => {
          const score = ecurieScoreByHorse[horse.id];
          const isOverdue = (upcomingHealth || []).some(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (r) => (r as any).horse_id === horse.id && daysUntil((r as any).next_date) < 0
          );
          const isSoon = (upcomingHealth || []).some(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (r) => (r as any).horse_id === horse.id && daysUntil((r as any).next_date) >= 0 && daysUntil((r as any).next_date) <= 7
          );
          return (
            <div key={horse.id} className="flex items-center gap-3 p-3">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                {horse.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={horse.avatar_url} alt={horse.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                    <span className="text-white font-black text-xs">{horse.name[0]}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-black truncate">{horse.name}</p>
                <p className="text-xs text-gray-400 truncate">{horse.ecurie}</p>
                {(horse as any).owner_email && (
                  <div className="mt-1">
                    <NotifierProprietaire
                      horseId={horse.id}
                      horseName={horse.name}
                      ownerEmail={(horse as any).owner_email}
                      ownerName={(horse as any).owner_name}
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isOverdue && (
                  <span className="text-2xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">Retard</span>
                )}
                {!isOverdue && isSoon && (
                  <span className="text-2xs font-bold text-orange bg-orange-light px-1.5 py-0.5 rounded-full">Prévu</span>
                )}
                {!isOverdue && !isSoon && (
                  <span className="text-2xs font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">RAS</span>
                )}
                {score !== undefined && (
                  <span className="text-xs font-black" style={{ color: getScoreColor(score) }}>{score}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  ) : null;

  const coachBlock = moduleCoach ? (
    <CoursAujourdhui
      todaySessions={coachTodaySessions}
      students={coachStudents}
      today={todayStr}
    />
  ) : null;

  const agendaBlock = (["pro", "gerant"].includes(profileType) || moduleGerant) && agendaItems.length > 0 ? (
    <AgendaSemaine items={agendaItems} />
  ) : null;

  const suggestionBlock = profileType === "loisir" && (horses || []).length > 0 && firstHorse ? (() => {
    const last = lastSessionByHorse[firstHorse.id];
    const daysSince = last ? differenceInDays(now, new Date(last.date)) : null;
    const nextHealth = (upcomingHealth || []).find((h) => (h as any).horse_id === firstHorse.id && h.next_date && daysUntil(h.next_date) >= 0);
    const healthDaysVal = nextHealth ? daysUntil(nextHealth.next_date!) : undefined;
    return (
      <SuggestionIA
        horseName={firstHorse.name}
        daysSinceSession={daysSince}
        hasUpcomingHealth={!!nextHealth}
        healthType={nextHealth ? HEALTH_TYPE_LABELS[(nextHealth as any).type] : undefined}
        healthDays={healthDaysVal ?? undefined}
      />
    );
  })() : null;

  const feedBlock = profileType === "loisir" && feedItems.length > 0 ? (
    <FeedMiniDashboard items={feedItems} />
  ) : null;

  const blockMap: Partial<Record<BlockKey, React.ReactNode>> = {
    chevaux: chevauxBlock,
    programme: programmeBlock,
    concours: concoursBlock,
    plan_ia: planIABlock,
    notes_seance: notesDerniereSeanceBlock,
    sessions: sessionsBlock,
    ecurie: ecurieBlock,
    alertes: alertesBlock,
    todo: todoBlock,
    coach: coachBlock,
    agenda: agendaBlock,
    suggestion: suggestionBlock,
    feed: feedBlock,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">

      {/* ── Header Bonjour ─────────────────────────────────────────────── */}
      {headerBlock}

      {/* ── Empty state 0 chevaux ─────────────────────────────────────── */}
      {(horses || []).length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-6 rounded-2xl border-2 border-dashed border-gray-200 text-center bg-white">
          <div className="text-5xl mb-4">🐴</div>
          <h2 className="text-xl font-black text-black mb-2">Ajoutez votre premier cheval</h2>
          <p className="text-sm text-gray-400 mb-6 max-w-sm leading-relaxed">
            Créez la fiche de votre cheval pour activer le suivi santé, le journal de travail et le
            Horse Index.
          </p>
          <Link
            href="/horses/new"
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-black text-white font-bold text-sm hover:bg-gray-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Ajouter mon premier cheval
          </Link>
          <div className="grid grid-cols-3 gap-4 mt-8 w-full max-w-sm">
            {[
              { emoji: "🩺", label: "Carnet santé" },
              { emoji: "📊", label: "Horse Index" },
              { emoji: "🤖", label: "Coach IA" },
            ].map((f) => (
              <div key={f.label} className="flex flex-col items-center gap-1.5">
                <div className="text-2xl">{f.emoji}</div>
                <span className="text-xs font-semibold text-gray-400">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Checklist d'activation ────────────────────────────────────── */}
      <OnboardingChecklist
        hasHorse={(horses || []).length > 0}
        hasHealthRecord={(healthRecordsCount ?? 0) > 0}
        hasTrainingSession={(recentSessions || []).length > 0}
        hasScore={Object.keys(scoresByHorse).length > 0}
        firstHorseId={firstHorse?.id}
      />

      {/* ── Météo ─────────────────────────────────────────────────────── */}
      <WeatherWidget
        horses={(horses || []).map((h) => ({
          id: h.id,
          name: h.name,
          conditions_vie: (h as any).conditions_vie ?? null,
          tonte: (h as any).tonte ?? null,
          morphologie_meteo: (h as any).morphologie_meteo ?? null,
          etat_corporel: (h as any).etat_corporel ?? null,
          birth_year: h.birth_year ?? null,
          trousseau: (h as any).trousseau ?? [],
        }))}
        ecurie={userEcuries[0] ?? null}
      />

      {/* ── FIXE — Soins à venir (next 21 days) ───────────────────────── */}
      {alerts21Days.length > 0 && (horses || []).length > 0 && (
        <div className="card border border-orange/10 bg-orange-light/30">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="h-4 w-4 text-orange" />
            <h2 className="font-bold text-black text-sm">Soins à venir</h2>
          </div>
          <div className="space-y-2">
            {alerts21Days.slice(0, 5).map((h) => {
              const days = daysUntil(h.next_date!);
              const isOverdue = days < 0;
              const horseName = (h as any).horses?.name;
              return (
                <div key={h.id} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-black">
                      {HEALTH_TYPE_LABELS[h.type]} — {horseName}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      isOverdue
                        ? "bg-red-100 text-red-700"
                        : days <= 7
                        ? "bg-orange text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {isOverdue ? `${Math.abs(days)}j retard` : `J-${days}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Alerte vaccins FEI non silençable ─────────────────────── */}
      {vaccinsAlerte.length > 0 && (
        <div className="rounded-2xl border-2 border-red-400 bg-red-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-red-600 font-black text-sm uppercase tracking-wide">⚠ Vaccins FEI requis</span>
          </div>
          {vaccinsAlerte.map((a) => (
            <div key={a.horseId} className="flex items-center justify-between">
              <p className="text-sm text-red-700">
                <span className="font-bold">{a.horseName}</span> — vaccin non à jour, concours dans <span className="font-bold">J-{a.daysToComp}</span>
              </p>
              <Link
                href={`/horses/${a.horseId}/health`}
                className="text-xs font-bold text-red-600 underline underline-offset-2 flex-shrink-0 ml-3"
              >
                Mettre à jour →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* ── P6 Mode toggle ─────────────────────────────────────────────── */}
      {isP6 && (horses || []).length > 0 && (
        <DashboardModeToggle currentMode={dashMode} />
      )}

      {/* ── Dynamic blocks in temporal order ─────────────────────────── */}
      {(horses || []).length > 0 && (() => {
        // P6 Mode CAVALIER: hide gerant-specific blocks
        const cavalierExclude: BlockKey[] = ["alertes", "todo", "ecurie"];
        // Note: "coach" is intentionally NOT excluded from cavalierExclude
        // P6 Mode GÉRANT: hide cavalier-specific blocks
        const gerantExclude: BlockKey[] = ["chevaux", "programme", "concours", "plan_ia", "sessions"];

        const filtered = isP6
          ? blockOrder.filter((k) =>
              dashMode === "cavalier"
                ? !cavalierExclude.includes(k)
                : !gerantExclude.includes(k)
            )
          : blockOrder;

        return filtered.map((key) =>
          blockMap[key] ? <div key={key}>{blockMap[key]}</div> : null
        );
      })()}

      {/* ── Pensionnaires: in gérant mode or non-P6 gérant ─────────────── */}
      {pensionnairesBlock && (dashMode === "gerant" || !isP6) && (
        <div>{pensionnairesBlock}</div>
      )}

      {/* ── P6 Mode GÉRANT: own horses at bottom ───────────────────────── */}
      {isP6 && dashMode === "gerant" && chevauxBlock && (
        <div className="opacity-75">{chevauxBlock}</div>
      )}

      {/* ── Quick actions ─────────────────────────────────────────────── */}
      {quickActions.length > 0 && (horses || []).length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-3.5 w-3.5 text-orange" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              À faire
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {quickActions.map((action) => (
              <Link
                key={action.href + action.label}
                href={action.href}
                className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-2xl hover:border-gray-300 hover:shadow-card transition-all duration-200 min-w-[200px]"
              >
                <div
                  className={`w-8 h-8 rounded-xl ${action.bg} flex items-center justify-center flex-shrink-0`}
                >
                  <action.icon className={`h-4 w-4 ${action.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-black leading-none">{action.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{action.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── No horses dark CTA ────────────────────────────────────────── */}
      {(horses || []).length === 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F0F0F] via-[#1A1A1A] to-[#0F0F0F] p-8 text-center">
          {/* Decorative blurs */}
          <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-orange/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-orange/10 blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange to-orange/60 flex items-center justify-center mx-auto mb-5 shadow-orange">
              <span className="text-2xl">🐴</span>
            </div>
            <h2 className="text-xl font-black text-white mb-2">Bienvenue sur Equistra</h2>
            <p className="text-sm text-white/50 mb-8 max-w-xs mx-auto leading-relaxed">
              Ajoutez votre premier cheval pour accéder au suivi santé, journal de travail et Horse
              Index.
            </p>

            {/* Onboarding steps */}
            <div className="flex flex-col gap-3 mb-8 max-w-xs mx-auto text-left">
              {[
                { label: "Ajouter votre cheval", sub: "Nom, race, discipline", active: true },
                { label: "Carnet de santé", sub: "Vaccins, dentiste, ostéo..." },
                { label: "Analyse & Horse Index", sub: "Score IA, statistiques, classements" },
              ].map((step, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 ${step.active ? "opacity-100" : "opacity-35"}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      step.active ? "bg-orange text-white" : "bg-white/10 text-white/50"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        step.active ? "text-white" : "text-white/60"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-white/30">{step.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link href="/horses/new" className="btn-primary inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Ajouter mon premier cheval
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
