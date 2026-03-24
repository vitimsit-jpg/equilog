import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate, getScoreColor, TRAINING_TYPE_LABELS } from "@/lib/utils";
import { AlertTriangle, CheckCircle, Clock, Dumbbell, Heart, TrendingUp, Users } from "lucide-react";

export default async function MonEcuriePage() {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { data: userProfile } = await supabase
    .from("users")
    .select("user_type, profile_type, module_gerant")
    .eq("id", authUser.id)
    .single();

  const userType = userProfile?.user_type;
  const isManager =
    (userProfile as any)?.profile_type === "gerant" ||
    (userProfile as any)?.module_gerant === true ||
    ["gerant_ecurie", "gerant_cavalier"].includes(userType || "");
  if (!isManager) redirect("/dashboard");

  // Own horses
  const { data: myHorses } = await supabase
    .from("horses")
    .select("*")
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: true });

  if (!myHorses || myHorses.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-black text-black">Mon Écurie</h1>
          <p className="text-sm text-gray-400 mt-0.5">Tableau de bord gérant</p>
        </div>
        <div className="card text-center py-12">
          <Users className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <h2 className="font-bold text-black mb-2">Aucun cheval enregistré</h2>
          <p className="text-sm text-gray-400 mb-4">Ajoutez des chevaux pour accéder au tableau de bord.</p>
          <Link href="/horses/new" className="btn-primary">Ajouter un cheval</Link>
        </div>
      </div>
    );
  }

  const myHorseIds = myHorses.map((h) => h.id);
  const ecurieName = myHorses.find((h) => h.ecurie)?.ecurie || null;

  // Fetch all data in parallel
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  const sevenDaysAhead = new Date();
  sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7);
  const sevenDaysAheadStr = sevenDaysAhead.toISOString().split("T")[0];
  const todayStr = new Date().toISOString().split("T")[0];

  const [
    { data: healthRecords },
    { data: recentSessions },
    { data: latestScores },
    // Other ecurie horses (shared)
    { data: ecurieHorses },
    { data: nutritionRows },
  ] = await Promise.all([
    supabase
      .from("health_records")
      .select("*")
      .in("horse_id", myHorseIds)
      .not("next_date", "is", null)
      .lte("next_date", sevenDaysAheadStr)
      .order("next_date", { ascending: true }),
    supabase
      .from("training_sessions")
      .select("horse_id, date, type, duration_min, intensity")
      .in("horse_id", myHorseIds)
      .gte("date", sevenDaysAgoStr)
      .order("date", { ascending: false }),
    supabase
      .from("horse_scores")
      .select("horse_id, score, computed_at, score_breakdown")
      .in("horse_id", myHorseIds)
      .order("computed_at", { ascending: false })
      .limit(myHorseIds.length * 2),
    ecurieName
      ? supabase
          .from("horses")
          .select("id, name, discipline, breed")
          .eq("ecurie", ecurieName)
          .eq("share_horse_index", true)
          .neq("user_id", authUser.id)
          .limit(50)
      : Promise.resolve({ data: [] }),
    supabase
      .from("horse_nutrition")
      .select("horse_id, fibres, herbe, granules, complements, updated_at")
      .in("horse_id", myHorseIds),
  ]);

  // Latest score per horse
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scoreByHorse: Record<string, any> = {};
  (latestScores || []).forEach((s) => {
    if (!scoreByHorse[s.horse_id]) scoreByHorse[s.horse_id] = s;
  });

  // Sessions this week per horse
  const sessionsThisWeek: Record<string, number> = {};
  const lastSessionDate: Record<string, string> = {};
  (recentSessions || []).forEach((s) => {
    sessionsThisWeek[s.horse_id] = (sessionsThisWeek[s.horse_id] || 0) + 1;
    if (!lastSessionDate[s.horse_id]) lastSessionDate[s.horse_id] = s.date;
  });

  // Health alerts
  const overdueAlerts = (healthRecords || []).filter((h) => h.next_date < todayStr);
  const upcomingAlerts = (healthRecords || []).filter(
    (h) => h.next_date >= todayStr && h.next_date <= sevenDaysAheadStr
  );

  // Horses inactive > 7 days
  const inactiveHorses = myHorses.filter((h) => !sessionsThisWeek[h.id]);

  // Nutrition map
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nutritionByHorse: Record<string, any> = {};
  (nutritionRows || []).forEach((n) => { nutritionByHorse[n.horse_id] = n; });

  // Stats
  const totalSessionsWeek = (recentSessions || []).length;
  const avgScore = myHorses.filter((h) => scoreByHorse[h.id]).length > 0
    ? Math.round(
        myHorses
          .filter((h) => scoreByHorse[h.id])
          .reduce((sum, h) => sum + scoreByHorse[h.id].score, 0) /
          myHorses.filter((h) => scoreByHorse[h.id]).length
      )
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-black">Mon Écurie</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {ecurieName ? ecurieName : "Tableau de bord gérant"}
            {" · "}{myHorses.length} cheval{myHorses.length > 1 ? "x" : ""}
            {(ecurieHorses || []).length > 0 && ` + ${(ecurieHorses || []).length} pensionnaire${(ecurieHorses || []).length > 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Chevaux", value: myHorses.length, icon: Users, color: "text-black" },
          { label: "Séances (7j)", value: totalSessionsWeek, icon: Dumbbell, color: "text-orange" },
          { label: "Score moyen", value: avgScore ?? "—", icon: TrendingUp, color: "text-black" },
          { label: "Alertes", value: overdueAlerts.length + upcomingAlerts.length, icon: AlertTriangle, color: overdueAlerts.length > 0 ? "text-danger" : "text-warning" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card text-center py-4">
            <Icon className={`h-5 w-5 mx-auto mb-2 ${color}`} />
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main col */}
        <div className="lg:col-span-2 space-y-5">

          {/* Alertes santé */}
          {(overdueAlerts.length > 0 || upcomingAlerts.length > 0) && (
            <div className="card">
              <h2 className="font-bold text-black mb-3 flex items-center gap-2">
                <Heart className="h-4 w-4 text-danger" />
                Alertes santé
              </h2>
              <div className="space-y-2">
                {overdueAlerts.map((rec) => {
                  const horse = myHorses.find((h) => h.id === rec.horse_id);
                  return (
                    <Link
                      key={rec.id}
                      href={`/horses/${rec.horse_id}/health`}
                      className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-100 hover:bg-red-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-danger flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-black">{horse?.name} · {rec.type}</p>
                          <p className="text-xs text-danger">En retard · prévu le {formatDate(rec.next_date)}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
                {upcomingAlerts.map((rec) => {
                  const horse = myHorses.find((h) => h.id === rec.horse_id);
                  return (
                    <Link
                      key={rec.id}
                      href={`/horses/${rec.horse_id}/health`}
                      className="flex items-center justify-between p-3 rounded-xl bg-orange-50 border border-orange-100 hover:bg-orange-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-warning flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-black">{horse?.name} · {rec.type}</p>
                          <p className="text-xs text-warning">Dans 7j · {formatDate(rec.next_date)}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chevaux — vue agrégée */}
          <div className="card">
            <h2 className="font-bold text-black mb-3 flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-orange" />
              Activité & Horse Index
            </h2>
            <div className="space-y-2">
              {myHorses.map((horse) => {
                const score = scoreByHorse[horse.id];
                const sessions = sessionsThisWeek[horse.id] || 0;
                const lastSession = lastSessionDate[horse.id];
                const isInactive = !lastSession;
                return (
                  <Link
                    key={horse.id}
                    href={`/horses/${horse.id}`}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-black text-white font-black text-sm flex items-center justify-center flex-shrink-0">
                        {horse.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-black">{horse.name}</p>
                        <p className="text-xs text-gray-400">
                          {horse.discipline || "—"}
                          {isInactive
                            ? <span className="text-warning ml-2">· Inactif cette semaine</span>
                            : <span className="text-success ml-2">· {sessions} séance{sessions > 1 ? "s" : ""} · {formatDate(lastSession)}</span>
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {score ? (
                        <>
                          <p className="text-xl font-black" style={{ color: getScoreColor(score.score) }}>{score.score}</p>
                          <p className="text-2xs text-gray-400">Horse Index</p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-300">—</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Inactivité */}
          {inactiveHorses.length > 0 && (
            <div className="card border-l-4 border-l-warning">
              <h2 className="font-bold text-black mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Inactifs cette semaine
              </h2>
              <div className="flex flex-wrap gap-2">
                {inactiveHorses.map((h) => (
                  <Link
                    key={h.id}
                    href={`/horses/${h.id}/training`}
                    className="text-xs font-semibold px-3 py-1.5 bg-orange-light text-orange rounded-full hover:bg-orange hover:text-white transition-colors"
                  >
                    {h.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right col */}
        <div className="space-y-5">
          {/* Pensionnaires */}
          {(ecurieHorses || []).length > 0 && (
            <div className="card">
              <h2 className="font-bold text-black mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                Pensionnaires
              </h2>
              <div className="space-y-2">
                {(ecurieHorses || []).map((horse) => (
                  <Link
                    key={horse.id}
                    href={`/share/${horse.id}`}
                    className="flex items-center gap-2 py-1.5 hover:opacity-70 transition-opacity"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 font-black text-xs flex items-center justify-center flex-shrink-0">
                      {horse.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-black">{horse.name}</p>
                      <p className="text-2xs text-gray-400">{horse.discipline || "—"}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Checklist bonne santé */}
          <div className="card">
            <h2 className="font-bold text-black mb-3 text-sm">État général</h2>
            <div className="space-y-2">
              {[
                { label: "Pas d'alertes en retard", ok: overdueAlerts.length === 0 },
                { label: "Tous actifs cette semaine", ok: inactiveHorses.length === 0 },
                { label: "Scores calculés", ok: myHorses.every((h) => !!scoreByHorse[h.id]) },
              ].map(({ label, ok }) => (
                <div key={label} className="flex items-center gap-2">
                  {ok
                    ? <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                    : <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
                  }
                  <p className={`text-xs ${ok ? "text-gray-600" : "text-warning font-semibold"}`}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Nutrition écurie */}
          <div className="card">
            <h2 className="font-bold text-black mb-3 text-sm">🥕 Nutrition de l&apos;écurie</h2>
            <div className="space-y-2">
              {myHorses.map((h) => {
                const n = nutritionByHorse[h.id];
                const hasModule = !!(h as any).module_nutrition;
                const hasSupplement = n?.complements?.length > 0;
                const fibresLabel = n?.fibres?.length > 0
                  ? (n.fibres as any[]).map((f: any) => f.mode === "volonte" ? `${f.type === "foin" ? "Foin" : f.type === "luzerne" ? "Luzerne" : "Mélange"} À vol.` : `${f.type === "foin" ? "Foin" : f.type === "luzerne" ? "Luzerne" : "Mélange"} ${f.quantite_kg}kg`).join(", ")
                  : null;
                return (
                  <div key={h.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-black truncate">{h.name}</p>
                      {n ? (
                        <p className="text-xs text-gray-400 truncate">{fibresLabel || "Ration configurée"}</p>
                      ) : (
                        <p className="text-xs text-gray-300">{hasModule ? "Ration non définie" : "Module non activé"}</p>
                      )}
                    </div>
                    {hasSupplement && (
                      <span className="text-2xs bg-orange-light text-orange font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                        {(n.complements as any[]).length} complément{(n.complements as any[]).length > 1 ? "s" : ""}
                      </span>
                    )}
                    {n && (
                      <Link href={`/horses/${h.id}/nutrition`} className="text-2xs text-gray-400 hover:text-black flex-shrink-0">
                        Voir →
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Raccourcis */}
          <div className="card">
            <h2 className="font-bold text-black mb-3 text-sm">Raccourcis</h2>
            <div className="space-y-1.5">
              {myHorses.slice(0, 4).map((h) => (
                <Link
                  key={h.id}
                  href={`/horses/${h.id}/health`}
                  className="flex items-center gap-2 text-xs text-gray-600 hover:text-black transition-colors py-1"
                >
                  <Heart className="h-3 w-3 text-gray-400" />
                  Soins · {h.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
