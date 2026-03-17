import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Heart, Dumbbell, TrendingUp, AlertCircle, Users, Trophy, Zap, Star, Target, Activity, ShieldCheck } from "lucide-react";
import { formatDate, daysUntil, HEALTH_TYPE_LABELS, getScoreColor } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import HorseAvatar from "@/components/ui/HorseAvatar";
import { differenceInDays, startOfWeek, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import WeatherWidget from "@/components/weather/WeatherWidget";
import OnboardingChecklist from "@/components/dashboard/OnboardingChecklist";
import HorseQuickActions from "@/components/dashboard/HorseQuickActions";

const PROFILE_WELCOME: Record<string, { title: string; subtitle: string; badge: string }> = {
  loisir:      { title: "Bonjour !", subtitle: "Voici l'état de votre cheval aujourd'hui.", badge: "Loisir" },
  competition: { title: "Prêt pour la saison ?", subtitle: "Vos performances et préparations concours.", badge: "Compétition" },
  pro:         { title: "Tableau de bord", subtitle: "Vue d'ensemble de tous vos chevaux.", badge: "Pro" },
  gerant:      { title: "Tableau de bord écurie", subtitle: "Vue d'ensemble de tous vos pensionnaires.", badge: "Gérant" },
};

// Legacy user_type fallback mapping
const LEGACY_WELCOME: Record<string, { title: string; subtitle: string; badge: string }> = {
  loisir:          PROFILE_WELCOME.loisir,
  competition:     PROFILE_WELCOME.competition,
  pro:             PROFILE_WELCOME.pro,
  gerant_cavalier: PROFILE_WELCOME.gerant,
  coach:           { title: "Mes élèves", subtitle: "Suivez la progression de vos couples cavalier–cheval.", badge: "Coach" },
  gerant_ecurie:   PROFILE_WELCOME.gerant,
};

const WIDGET_ORDER: Record<string, string[]> = {
  loisir:      ["alerts", "sessions_insights", "ecurie"],
  competition: ["competitions", "sessions_insights", "alerts", "ecurie"],
  pro:         ["sessions_insights", "competitions", "alerts", "ecurie"],
  gerant:      ["ecurie", "alerts", "sessions_insights"],
};

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { data: userProfile } = await supabase
    .from("users")
    .select("user_type, profile_type, module_coach, module_gerant")
    .eq("id", authUser.id)
    .single();

  // Redirect to onboarding if not yet completed
  if (!userProfile?.profile_type && !userProfile?.user_type) redirect("/onboarding");

  // Resolve effective profile (new system preferred, legacy fallback)
  const profileType = userProfile?.profile_type || "loisir";
  const userType = userProfile?.user_type || "loisir";
  const moduleCoach = userProfile?.module_coach ?? false;
  const moduleGerant = userProfile?.module_gerant ?? false;

  const welcome = PROFILE_WELCOME[profileType] ?? LEGACY_WELCOME[userType] ?? PROFILE_WELCOME.loisir;
  const widgetOrder = WIDGET_ORDER[profileType] ?? WIDGET_ORDER.loisir;

  const { data: horses } = await supabase
    .from("horses")
    .select("*")
    .eq("user_id", authUser.id);

  const horseIds = (horses || []).map((h) => h.id);
  const userEcuries = Array.from(new Set((horses || []).map((h) => h.ecurie).filter(Boolean))) as string[];
  const fetchCompetitions = ["competition", "pro"].includes(profileType) || ["competition", "pro", "gerant_cavalier"].includes(userType);
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split("T")[0];

  const [
    { data: latestScores },
    { data: upcomingHealth },
    { data: recentSessions },
    { data: recentInsights },
    { data: recentCompetitions },
    { count: sessionsCount30d },
    { count: healthRecordsCount },
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
      .limit(5),
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
          .order("date", { ascending: false })
          .limit(4)
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
  ]);

  const scoresByHorse: Record<string, number> = {};
  (latestScores || []).forEach((s) => {
    if (!scoresByHorse[s.horse_id]) scoresByHorse[s.horse_id] = s.score;
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

  const rankedEcurieHorses = [...ecurieHorses].sort(
    (a, b) => (ecurieScoreByHorse[b.id] ?? 0) - (ecurieScoreByHorse[a.id] ?? 0)
  );

  const alerts = (upcomingHealth || []).filter((h) => {
    const days = daysUntil(h.next_date!);
    return days <= 30;
  });
  const overdueRecords = alerts.filter((h) => daysUntil(h.next_date!) < 0);

  // Stats
  const scoresArr = Object.values(scoresByHorse);
  const avgScore = scoresArr.length ? Math.round(scoresArr.reduce((a, b) => a + b, 0) / scoresArr.length) : null;
  const nextAlert = (upcomingHealth || []).find((h) => h.next_date && daysUntil(h.next_date) >= 0);
  const nextAlertDays = nextAlert ? daysUntil(nextAlert.next_date!) : null;

  // Quick actions
  const firstHorse = (horses || [])[0];
  const now = new Date();
  const weekStart = startOfWeek(now, { locale: fr });
  const hasSessionThisWeek = (recentSessions || []).some((s) => new Date(s.date) >= weekStart);
  const latestScoreDate = firstHorse && (latestScores || []).find((s) => s.horse_id === firstHorse.id)?.computed_at;
  const scoreIsStale = !latestScoreDate || differenceInDays(now, new Date(latestScoreDate)) >= 7;
  const noObjectif = firstHorse && !(firstHorse as any).objectif_saison;

  type QuickAction = { label: string; sub: string; href: string; icon: React.ElementType; color: string; bg: string };
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

  // --- Widgets ---

  const widgetAlerts = alerts.length > 0 ? (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="h-4 w-4 text-warning" />
        <h2 className="font-bold text-black">Rappels à venir</h2>
      </div>
      <div className="space-y-2">
        {alerts.map((h) => {
          const days = daysUntil(h.next_date!);
          const isOverdue = days < 0;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const horseName = (h as any).horses?.name;
          return (
            <div key={h.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <Heart className="h-3.5 w-3.5 text-gray-400" />
                <div>
                  <span className="text-sm font-medium text-black">
                    {HEALTH_TYPE_LABELS[h.type]} — {horseName}
                  </span>
                  <p className="text-xs text-gray-400">{formatDate(h.next_date!)}</p>
                </div>
              </div>
              <Badge variant={isOverdue ? "danger" : days <= 7 ? "danger" : "warning"}>
                {isOverdue ? `${Math.abs(days)}j de retard` : `J-${days}`}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  ) : null;

  const widgetSessionsInsights = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {(recentSessions || []).length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Dumbbell className="h-4 w-4 text-gray-400" />
            <h2 className="font-bold text-black">Séances récentes</h2>
          </div>
          <div className="space-y-2">
            {(recentSessions || []).slice(0, 4).map((s) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const horseName = (s as any).horses?.name;
              return (
                <div key={s.id} className="flex items-center justify-between py-1.5">
                  <div>
                    <span className="text-sm font-medium text-black">{horseName}</span>
                    <p className="text-xs text-gray-400">{s.type} · {s.duration_min}min</p>
                  </div>
                  <div className="text-right">
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={`w-1.5 h-3 rounded-full ${i < s.intensity ? "bg-orange" : "bg-gray-200"}`} />
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(s.date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {(recentInsights || []).length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-orange" />
            <h2 className="font-bold text-black">Insights IA</h2>
          </div>
          <div className="space-y-3">
            {(recentInsights || []).map((insight) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const horseName = (insight as any).horses?.name;
              let parsed: { summary?: string } = {};
              try { parsed = JSON.parse(insight.content); } catch {}
              return (
                <div key={insight.id} className="p-3 rounded-xl bg-orange-light border border-orange/10">
                  <p className="text-xs font-semibold text-orange mb-1">{horseName}</p>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {parsed.summary || insight.content.substring(0, 120)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const widgetCompetitions = fetchCompetitions ? (
    (recentCompetitions || []).length > 0 ? (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-orange" />
            <h2 className="font-bold text-black">Résultats récents</h2>
          </div>
          <Link href={`/horses/${horseIds[0]}/competitions`} className="text-xs text-orange font-semibold hover:underline">
            Voir tout →
          </Link>
        </div>
        <div className="space-y-2">
          {(recentCompetitions || []).map((c) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const horseName = (c as any).horses?.name;
            const hasRank = c.result_rank && c.total_riders;
            return (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-black">{c.event_name}</p>
                  <p className="text-xs text-gray-400">{horseName} · {c.discipline} · {formatDate(c.date)}</p>
                </div>
                {hasRank ? (
                  <p className="text-lg font-black text-black">{c.result_rank}<span className="text-xs text-gray-400 font-normal">/{c.total_riders}</span></p>
                ) : (
                  <span className="text-xs text-gray-300">—</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    ) : (
      <div className="card border-2 border-dashed border-gray-200 text-center py-8">
        <Trophy className="h-6 w-6 text-gray-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-black mb-1">Aucun concours enregistré</p>
        <p className="text-xs text-gray-400 mb-3">Ajoutez vos résultats pour suivre votre palmarès.</p>
        {horseIds[0] && (
          <Link href={`/horses/${horseIds[0]}/competitions`} className="text-xs font-semibold text-orange hover:underline">
            Ajouter un concours →
          </Link>
        )}
      </div>
    )
  ) : null;

  const showEcurieWidget = true; // visible for all profiles when ecurie data exists
  const widgetEcurie = showEcurieWidget ? (
    rankedEcurieHorses.length > 0 && userEcuries[0] ? (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <h2 className="font-bold text-black">Mon écurie</h2>
            <span className="text-xs text-gray-400 font-normal">— {userEcuries[0]}</span>
          </div>
          <Link href={`/ecurie/${encodeURIComponent(userEcuries[0])}`} className="text-xs text-orange font-semibold hover:underline">
            Voir tout →
          </Link>
        </div>
        <div className="space-y-2">
          {rankedEcurieHorses.slice(0, 5).map((horse, idx) => {
            const score = ecurieScoreByHorse[horse.id];
            return (
              <div key={horse.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-300 w-4">{idx + 1}</span>
                  <HorseAvatar name={horse.name} photoUrl={horse.avatar_url} size="xs" rounded="lg" />
                  <div>
                    <p className="text-sm font-semibold text-black">{horse.name}</p>
                    <p className="text-xs text-gray-400">{horse.discipline || horse.breed || "—"}</p>
                  </div>
                </div>
                {score !== undefined ? (
                  <p className="text-lg font-black" style={{ color: getScoreColor(score) }}>{score}</p>
                ) : (
                  <p className="text-sm text-gray-300 font-bold">—</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    ) : null
  ) : null;

  const WIDGETS: Record<string, React.ReactNode> = {
    alerts: widgetAlerts,
    sessions_insights: widgetSessionsInsights,
    competitions: widgetCompetitions,
    ecurie: widgetEcurie,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">

      {/* ── Hero header ───────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-br from-[#1A1A1A] to-[#2D1A0E] px-6 py-6 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <h1 className="text-2xl font-black text-white">{welcome.title}</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange/20 text-orange border border-orange/30">
              {welcome.badge}
            </span>
            {moduleCoach && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Coach
              </span>
            )}
            {moduleGerant && profileType !== "gerant" && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30">
                Gérant
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">{welcome.subtitle}</p>
        </div>
        <Link href="/horses/new" className="btn-primary flex-shrink-0">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nouveau cheval</span>
          <span className="sm:hidden">+</span>
        </Link>
      </div>

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

      {/* ── Stats strip ───────────────────────────────────────────────── */}
      {(horses || []).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Séances 30j */}
          <div className="card p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Activity className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-2xs font-bold uppercase tracking-wide text-gray-400">Séances (30j)</span>
            </div>
            <div className="text-3xl font-black text-black leading-none">{sessionsCount30d ?? 0}</div>
            <p className="text-xs text-gray-400 mt-0.5">entraînements</p>
          </div>

          {/* Horse Index moyen */}
          <div className="card p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Star className="h-3.5 w-3.5 text-orange" />
              <span className="text-2xs font-bold uppercase tracking-wide text-gray-400">Horse Index</span>
            </div>
            {avgScore !== null ? (
              <>
                <div className="text-3xl font-black leading-none" style={{ color: getScoreColor(avgScore) }}>{avgScore}</div>
                <p className="text-xs text-gray-400 mt-0.5">score moyen</p>
              </>
            ) : (
              <>
                <div className="text-3xl font-black text-gray-200 leading-none">—</div>
                <p className="text-xs text-gray-400 mt-0.5">non calculé</p>
              </>
            )}
          </div>

          {/* Soins en retard */}
          <div className={`card p-4 flex flex-col gap-1 ${overdueRecords.length > 0 ? "border border-red-100" : ""}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <ShieldCheck className={`h-3.5 w-3.5 ${overdueRecords.length > 0 ? "text-danger" : "text-success"}`} />
              <span className="text-2xs font-bold uppercase tracking-wide text-gray-400">Santé</span>
            </div>
            <div className={`text-3xl font-black leading-none ${overdueRecords.length > 0 ? "text-danger" : "text-success"}`}>
              {overdueRecords.length > 0 ? overdueRecords.length : "✓"}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {overdueRecords.length > 0 ? `soin${overdueRecords.length > 1 ? "s" : ""} en retard` : "à jour"}
            </p>
          </div>

          {/* Prochaine échéance */}
          <div className="card p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Heart className="h-3.5 w-3.5 text-pink-500" />
              <span className="text-2xs font-bold uppercase tracking-wide text-gray-400">Prochain soin</span>
            </div>
            {nextAlertDays !== null ? (
              <>
                <div className={`text-3xl font-black leading-none ${nextAlertDays <= 7 ? "text-warning" : "text-black"}`}>
                  J-{nextAlertDays}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {nextAlert && HEALTH_TYPE_LABELS[(nextAlert as any).type]}
                </p>
              </>
            ) : (
              <>
                <div className="text-3xl font-black text-gray-200 leading-none">—</div>
                <p className="text-xs text-gray-400 mt-0.5">aucun prévu</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Mes chevaux — cards photo ─────────────────────────────────── */}
      {(horses || []).length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-black">Mes chevaux</h2>
            <Link href="/horses/new" className="text-xs text-gray-400 hover:text-orange transition-colors font-medium flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </Link>
          </div>

          {/* Mobile: horizontal snap carousel — full bleed */}
          <div className="md:hidden -mx-4">
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-3" style={{ scrollbarWidth: "none" }}>
              {(horses || []).map((horse) => {
                const score = scoresByHorse[horse.id];
                const avatarUrl = (horse as any).avatar_url;
                const overdue = overdueRecords.filter((r) => (r as any).horse_id === horse.id).length;
                return (
                  <Link
                    key={horse.id}
                    href={`/horses/${horse.id}`}
                    className="relative flex-shrink-0 w-[78vw] rounded-2xl overflow-hidden h-[220px] flex flex-col justify-end snap-start shadow-card active:scale-[0.98] transition-transform"
                  >
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt={horse.name} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-700 via-gray-800 to-[#2D1A0E]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                    {score !== undefined && (
                      <div className="absolute top-3 right-3 flex flex-col items-center bg-black/40 backdrop-blur-sm rounded-xl px-2.5 py-1.5 border border-white/15">
                        <span className="text-xl font-black text-white leading-none" style={{ color: getScoreColor(score) }}>{score}</span>
                        <span className="text-2xs text-white/50 uppercase tracking-wider leading-none mt-0.5">Index</span>
                      </div>
                    )}
                    {overdue > 0 && (
                      <div className="absolute top-3 left-3 flex items-center gap-1 bg-danger/90 backdrop-blur-sm rounded-xl px-2.5 py-1 border border-red-400/30">
                        <Heart className="h-3 w-3 text-white" />
                        <span className="text-xs font-bold text-white">{overdue} en retard</span>
                      </div>
                    )}
                    <div className="relative z-10 px-4 py-4">
                      <h3 className="text-lg font-black text-white leading-tight">{horse.name}</h3>
                      <p className="text-xs text-white/50 mt-0.5">
                        {[horse.breed, horse.discipline].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                  </Link>
                );
              })}
              {/* Add card */}
              <Link
                href="/horses/new"
                className="flex-shrink-0 w-[55vw] snap-start rounded-2xl h-[220px] flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 active:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Plus className="h-5 w-5 text-gray-400" />
                </div>
                <span className="text-sm font-semibold text-gray-400">Ajouter</span>
              </Link>
            </div>
          </div>

          {/* Desktop: grid */}
          <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
            {(horses || []).map((horse) => {
              const score = scoresByHorse[horse.id];
              const avatarUrl = (horse as any).avatar_url;
              const overdue = overdueRecords.filter((r) => (r as any).horse_id === horse.id).length;
              return (
                <Link
                  key={horse.id}
                  href={`/horses/${horse.id}`}
                  className="relative rounded-2xl overflow-hidden min-h-[200px] flex flex-col justify-end group cursor-pointer shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5"
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={horse.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-700 via-gray-800 to-[#2D1A0E]" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  {score !== undefined && (
                    <div className="absolute top-3 right-3 flex flex-col items-center bg-black/40 backdrop-blur-sm rounded-xl px-2.5 py-1.5 border border-white/15">
                      <span className="text-xl font-black text-white leading-none" style={{ color: getScoreColor(score) }}>{score}</span>
                      <span className="text-2xs text-white/50 uppercase tracking-wider leading-none mt-0.5">Index</span>
                    </div>
                  )}
                  {overdue > 0 && (
                    <div className="absolute top-3 left-3 flex items-center gap-1 bg-danger/90 backdrop-blur-sm rounded-xl px-2.5 py-1 border border-red-400/30">
                      <Heart className="h-3 w-3 text-white" />
                      <span className="text-xs font-bold text-white">{overdue} en retard</span>
                    </div>
                  )}
                  <div className="relative z-10 px-4 py-4">
                    <h3 className="text-lg font-black text-white leading-tight">{horse.name}</h3>
                    <p className="text-xs text-white/50 mt-0.5">
                      {[horse.breed, horse.discipline].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                </Link>
              );
            })}
            <Link
              href="/horses/new"
              className="relative rounded-2xl min-h-[200px] flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-orange text-gray-400 hover:text-orange transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-orange-light flex items-center justify-center transition-colors">
                <Plus className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold">Ajouter un cheval</span>
            </Link>
          </div>
        </div>
      )}

      {/* ── État du jour ─────────────────────────────────────────────── */}
      {(horses || []).length > 0 && (
        <HorseQuickActions
          horses={(horses || []).map((h) => ({ id: h.id, name: h.name, avatar_url: (h as any).avatar_url ?? null }))}
        />
      )}

      {/* ── Quick actions ─────────────────────────────────────────────── */}
      {quickActions.length > 0 && (horses || []).length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-3.5 w-3.5 text-orange" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">À faire</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {quickActions.map((action) => (
              <Link
                key={action.href + action.label}
                href={action.href}
                className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-2xl hover:border-gray-300 hover:shadow-card transition-all duration-200 min-w-[200px]"
              >
                <div className={`w-8 h-8 rounded-xl ${action.bg} flex items-center justify-center flex-shrink-0`}>
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

      {/* ── No horses CTA ─────────────────────────────────────────────── */}
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
              Ajoutez votre premier cheval pour accéder au suivi santé, journal de travail et Horse Index.
            </p>

            {/* Onboarding steps */}
            <div className="flex flex-col gap-3 mb-8 max-w-xs mx-auto text-left">
              {[
                { label: "Ajouter votre cheval", sub: "Nom, race, discipline", active: true },
                { label: "Carnet de santé", sub: "Vaccins, dentiste, ostéo..." },
                { label: "Analyse & Horse Index", sub: "Score IA, statistiques, classements" },
              ].map((step, i) => (
                <div key={i} className={`flex items-center gap-3 ${step.active ? "opacity-100" : "opacity-35"}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${step.active ? "bg-orange text-white" : "bg-white/10 text-white/50"}`}>
                    {i + 1}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${step.active ? "text-white" : "text-white/60"}`}>{step.label}</p>
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

      {/* ── Widgets in profile order ───────────────────────────────────── */}
      {(horses || []).length > 0 && widgetOrder.map((key) => (
        WIDGETS[key] ? <div key={key}>{WIDGETS[key]}</div> : null
      ))}
    </div>
  );
}
