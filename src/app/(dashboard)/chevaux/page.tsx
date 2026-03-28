import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Heart, Dumbbell, Star } from "lucide-react";
import HorseAvatar from "@/components/ui/HorseAvatar";
import { HEALTH_TYPE_LABELS } from "@/lib/utils";
import { differenceInDays } from "date-fns";
import ChevauxQuickAdd from "@/components/chevaux/ChevauxQuickAdd";

export default async function ChevauxPage() {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { data: horses } = await supabase
    .from("horses")
    .select("*")
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: true });

  const horseList = horses || [];
  const horseIds = horseList.map((h) => h.id);
  const today = new Date().toISOString().split("T")[0];

  const [
    { data: recentSessions },
    { data: overdueRecords },
    { data: soonRecords },
    { data: scores },
  ] = await Promise.all([
    horseIds.length
      ? supabase.from("training_sessions").select("horse_id, date, type").in("horse_id", horseIds).order("date", { ascending: false }).limit(horseIds.length * 3)
      : Promise.resolve({ data: [] }),
    horseIds.length
      ? supabase.from("health_records").select("horse_id").in("horse_id", horseIds).not("next_date", "is", null).lt("next_date", today)
      : Promise.resolve({ data: [] }),
    horseIds.length
      ? supabase.from("health_records").select("horse_id, type, next_date").in("horse_id", horseIds).not("next_date", "is", null).gte("next_date", today).lte("next_date", new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]).order("next_date", { ascending: true })
      : Promise.resolve({ data: [] }),
    horseIds.length
      ? supabase.from("horse_scores").select("horse_id, score").in("horse_id", horseIds).order("computed_at", { ascending: false }).limit(horseIds.length * 2)
      : Promise.resolve({ data: [] }),
  ]);

  // Last session per horse
  const lastSessionByHorse: Record<string, { date: string; type: string }> = {};
  (recentSessions || []).forEach((s) => {
    if (!lastSessionByHorse[s.horse_id]) lastSessionByHorse[s.horse_id] = s;
  });

  // Overdue count per horse
  const overdueByHorse: Record<string, number> = {};
  (overdueRecords || []).forEach((r) => {
    overdueByHorse[r.horse_id] = (overdueByHorse[r.horse_id] || 0) + 1;
  });

  // Next soin per horse
  const nextSoinByHorse: Record<string, { type: string; next_date: string }> = {};
  (soonRecords || []).forEach((r) => {
    if (!nextSoinByHorse[r.horse_id]) nextSoinByHorse[r.horse_id] = r;
  });

  // Latest score per horse
  const scoreByHorse: Record<string, number> = {};
  (scores || []).forEach((s) => {
    if (!scoreByHorse[s.horse_id]) scoreByHorse[s.horse_id] = s.score;
  });

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-black">Mes chevaux</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {horseList.length === 0
              ? "Aucun cheval enregistré"
              : `${horseList.length} cheval${horseList.length > 1 ? "aux" : ""}`}
          </p>
        </div>
        <Link href="/horses/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          Ajouter
        </Link>
      </div>

      {horseList.length === 0 ? (
        <div className="card text-center py-14">
          <div className="text-5xl mb-4">🐴</div>
          <h2 className="text-lg font-bold text-black mb-2">Aucun cheval pour l&apos;instant</h2>
          <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">
            Ajoutez votre premier cheval pour commencer à suivre ses séances et sa santé.
          </p>
          <Link href="/horses/new" className="btn-primary inline-flex">
            <Plus className="h-4 w-4" />
            Ajouter mon cheval
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {horseList.map((horse) => {
            const lastSession = lastSessionByHorse[horse.id];
            const overdue = overdueByHorse[horse.id] || 0;
            const nextSoin = nextSoinByHorse[horse.id];
            const score = scoreByHorse[horse.id];
            const daysSinceSession = lastSession
              ? differenceInDays(new Date(), new Date(lastSession.date))
              : null;

            return (
              <div key={horse.id} className="card p-0 overflow-hidden">
                {/* Top row */}
                <Link
                  href={`/horses/${horse.id}`}
                  className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50/50 transition-colors"
                >
                  <HorseAvatar name={horse.name} photoUrl={horse.avatar_url} size="lg" rounded="xl" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-black text-base">{horse.name}</span>
                      {overdue > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-danger text-white text-2xs font-bold flex-shrink-0">
                          {overdue} retard{overdue > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {[horse.breed, horse.discipline, horse.ecurie].filter(Boolean).join(" · ") || "Profil à compléter"}
                    </p>
                  </div>
                  {score && (
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 justify-end">
                        <Star className="h-3.5 w-3.5 text-orange fill-orange" />
                        <span className="font-black text-black text-lg">{score}</span>
                      </div>
                      <span className="text-2xs text-gray-400">Horse Index</span>
                    </div>
                  )}
                </Link>

                {/* Stats row */}
                <div className="border-t border-gray-100 grid grid-cols-2 divide-x divide-gray-100">
                  {/* Last session */}
                  <div className="flex items-center gap-2.5 px-4 py-3">
                    <div className="w-8 h-8 rounded-xl bg-orange-light flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="h-4 w-4 text-orange" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-2xs text-gray-400 font-medium">Dernière séance</p>
                      {lastSession ? (
                        <p className="text-xs font-bold text-black truncate">
                          {daysSinceSession === 0 ? "Aujourd'hui" : daysSinceSession === 1 ? "Hier" : `Il y a ${daysSinceSession}j`}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">Aucune séance</p>
                      )}
                    </div>
                  </div>

                  {/* Health */}
                  <div className="flex items-center gap-2.5 px-4 py-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${overdue > 0 ? "bg-red-50" : "bg-green-50"}`}>
                      <Heart className={`h-4 w-4 ${overdue > 0 ? "text-danger" : "text-success"}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-2xs text-gray-400 font-medium">Santé</p>
                      {overdue > 0 ? (
                        <p className="text-xs font-bold text-danger">{overdue} soin{overdue > 1 ? "s" : ""} en retard</p>
                      ) : nextSoin ? (
                        <p className="text-xs font-bold text-black truncate">
                          {(HEALTH_TYPE_LABELS as Record<string, string>)[nextSoin.type] || nextSoin.type} dans {differenceInDays(new Date(nextSoin.next_date), new Date())}j
                        </p>
                      ) : (
                        <p className="text-xs text-success font-semibold">À jour</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-gray-100 grid grid-cols-3 divide-x divide-gray-100">
                  <Link href={`/horses/${horse.id}/health`} className="flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-gray-500 hover:bg-gray-50 hover:text-black transition-colors">
                    <Heart className="h-3.5 w-3.5" />
                    Santé
                  </Link>
                  <Link href={`/horses/${horse.id}/training`} className="flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-gray-500 hover:bg-gray-50 hover:text-black transition-colors">
                    <Dumbbell className="h-3.5 w-3.5" />
                    Travail
                  </Link>
                  <ChevauxQuickAdd horse={horse} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
