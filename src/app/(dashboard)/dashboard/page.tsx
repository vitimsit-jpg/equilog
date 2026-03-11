import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Heart, Dumbbell, TrendingUp, AlertCircle, Users, Trophy } from "lucide-react";
import { formatDate, daysUntil, HEALTH_TYPE_LABELS, getScoreColor } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import HorseAvatar from "@/components/ui/HorseAvatar";

const USER_TYPE_WELCOME: Record<string, { title: string; subtitle: string; badge: string }> = {
  loisir:          { title: "Bonjour !", subtitle: "Voici l'état de votre cheval aujourd'hui.", badge: "Loisir" },
  competition:     { title: "Prêt pour la saison ?", subtitle: "Vos performances et préparations concours.", badge: "Compétition" },
  pro:             { title: "Tableau de bord", subtitle: "Vue d'ensemble de tous vos chevaux.", badge: "Pro" },
  gerant_cavalier: { title: "Tableau de bord", subtitle: "Votre écurie et vos chevaux en un coup d'œil.", badge: "Gérant cavalier" },
  coach:           { title: "Mes élèves", subtitle: "Suivez la progression de vos couples cavalier–cheval.", badge: "Coach" },
  gerant_ecurie:   { title: "Tableau de bord écurie", subtitle: "Vue d'ensemble de tous vos pensionnaires.", badge: "Gérant écurie" },
};

// Widgets shown for each profile (in order)
const WIDGET_ORDER: Record<string, string[]> = {
  loisir:          ["horses", "alerts", "sessions_insights", "ecurie"],
  competition:     ["horses", "competitions", "sessions_insights", "alerts", "ecurie"],
  pro:             ["horses", "sessions_insights", "competitions", "alerts", "ecurie"],
  gerant_cavalier: ["ecurie", "horses", "alerts", "sessions_insights"],
  coach:           ["horses", "sessions_insights", "ecurie"],
  gerant_ecurie:   ["ecurie", "horses", "alerts"],
};

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { data: userProfile } = await supabase
    .from("users")
    .select("user_type")
    .eq("id", authUser.id)
    .single();

  const userType = userProfile?.user_type || "loisir";
  const welcome = USER_TYPE_WELCOME[userType] || USER_TYPE_WELCOME.loisir;
  const widgetOrder = WIDGET_ORDER[userType] || WIDGET_ORDER.loisir;

  const { data: horses } = await supabase
    .from("horses")
    .select("*")
    .eq("user_id", authUser.id);

  const horseIds = (horses || []).map((h) => h.id);
  const userEcuries = Array.from(new Set((horses || []).map((h) => h.ecurie).filter(Boolean))) as string[];

  const fetchCompetitions = ["competition", "pro", "gerant_cavalier"].includes(userType);

  const [
    { data: latestScores },
    { data: upcomingHealth },
    { data: recentSessions },
    { data: recentInsights },
    { data: recentCompetitions },
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

  // --- Widget JSX ---

  const widgetHorses = (horses || []).length > 0 ? (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {(horses || []).map((horse) => {
        const score = scoresByHorse[horse.id];
        return (
          <Link key={horse.id} href={`/horses/${horse.id}`} className="card-hover group">
            <div className="flex items-start justify-between mb-3">
              <HorseAvatar name={horse.name} photoUrl={horse.avatar_url} size="lg" />
              {score !== undefined && (
                <div className="text-right">
                  <div className="text-2xl font-black text-black">{score}</div>
                  <div className="text-2xs text-gray-400 uppercase tracking-wide">Horse Index</div>
                </div>
              )}
            </div>
            <h3 className="font-bold text-black">{horse.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {horse.breed && `${horse.breed} · `}
              {horse.discipline}
            </p>
          </Link>
        );
      })}
      <Link
        href="/horses/new"
        className="card border-2 border-dashed border-gray-200 hover:border-orange transition-colors flex items-center justify-center gap-2 text-gray-400 hover:text-orange min-h-[100px]"
      >
        <Plus className="h-4 w-4" />
        <span className="text-sm font-medium">Ajouter un cheval</span>
      </Link>
    </div>
  ) : null;

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
                        <div
                          key={i}
                          className={`w-1.5 h-3 rounded-full ${i < s.intensity ? "bg-orange" : "bg-gray-200"}`}
                        />
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
                <div key={insight.id} className="p-3 rounded-lg bg-orange-light border border-orange/10">
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
                  <div className="text-right">
                    <p className="text-lg font-black text-black">{c.result_rank}<span className="text-xs text-gray-400 font-normal">/{c.total_riders}</span></p>
                  </div>
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

  const showEcurieWidget = ["gerant_ecurie", "gerant_cavalier", "pro", "competition", "loisir"].includes(userType);
  const widgetEcurie = showEcurieWidget ? (
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
    ) : (
      <div className="card border-2 border-dashed border-gray-200 text-center py-8">
        <Users className="h-6 w-6 text-gray-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-black mb-1">Aucun pensionnaire visible</p>
        <p className="text-xs text-gray-400 mb-3">
          Renseignez le nom de votre écurie sur votre fiche cheval pour voir les autres pensionnaires qui partagent leur Horse Index.
        </p>
        {horseIds[0] && (
          <Link href={`/horses/${horseIds[0]}`} className="text-xs font-semibold text-orange hover:underline">
            Renseigner mon écurie →
          </Link>
        )}
      </div>
    )
  ) : null;

  const WIDGETS: Record<string, React.ReactNode> = {
    horses: widgetHorses,
    alerts: widgetAlerts,
    sessions_insights: widgetSessionsInsights,
    competitions: widgetCompetitions,
    ecurie: widgetEcurie,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-black">{welcome.title}</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-light text-orange border border-orange/20">
              {welcome.badge}
            </span>
          </div>
          <p className="text-sm text-gray-400">{welcome.subtitle}</p>
        </div>
        <Link href="/horses/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          Nouveau cheval
        </Link>
      </div>

      {/* Overdue health banner */}
      {overdueRecords.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-700 flex-1">
            {overdueRecords.length} soin{overdueRecords.length > 1 ? "s" : ""} en retard —{" "}
            {overdueRecords.map((h) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const horseName = (h as any).horses?.name;
              return `${HEALTH_TYPE_LABELS[h.type]} (${horseName})`;
            }).join(", ")}
          </p>
        </div>
      )}

      {/* No horses CTA */}
      {(horses || []).length === 0 && (
        <div className="card text-center py-12">
          <div className="w-16 h-16 rounded-full bg-beige flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🐴</span>
          </div>
          <h2 className="text-lg font-bold text-black mb-2">Bienvenue sur Equistra</h2>
          <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
            Commencez par ajouter votre premier cheval pour suivre sa santé, son entraînement et ses résultats.
          </p>
          <Link href="/horses/new" className="btn-primary">
            <Plus className="h-4 w-4" />
            Ajouter mon premier cheval
          </Link>
        </div>
      )}

      {/* Widgets in profile-specific order */}
      {(horses || []).length > 0 && widgetOrder.map((key) => (
        WIDGETS[key] ? <div key={key}>{WIDGETS[key]}</div> : null
      ))}
    </div>
  );
}
