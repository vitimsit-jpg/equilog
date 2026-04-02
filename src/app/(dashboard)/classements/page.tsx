import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { getScoreColor, getScoreLabel, DISCIPLINE_LABELS } from "@/lib/utils";
import { Trophy, Medal } from "lucide-react";
import ClassementsFilters from "@/components/classements/ClassementsFilters";
import HorseAvatar from "@/components/ui/HorseAvatar";
import UpgradeBanner from "@/components/ui/UpgradeBanner";

interface SearchParams {
  discipline?: string;
  region?: string;
  mode?: string;
}

interface Props {
  searchParams: SearchParams;
}

type ScoreWithHorse = {
  id: string;
  score: number;
  computed_at: string;
  percentile_region: number | null;
  percentile_category: number | null;
  score_breakdown: { mode?: string } | null;
  horses: {
    id: string;
    name: string;
    breed: string | null;
    discipline: string | null;
    ecurie: string | null;
    region: string | null;
    share_horse_index: boolean;
    avatar_url: string | null;
    horse_index_mode: string | null;
  };
};

export default async function ClassementsPage({ searchParams }: Props) {
  const supabase = createClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return <UpgradeBanner feature="Classements Horse Index" requiredPlan="pro" />;

  const { data: userProfile } = await supabase.from("users").select("plan").eq("id", authUser.id).single();
  if ((userProfile?.plan ?? "starter") === "starter") {
    return <UpgradeBanner feature="Classements Horse Index" requiredPlan="pro" />;
  }

  const { data: rawScores } = await supabase
    .from("horse_scores")
    .select("*, horses!inner(id, name, breed, discipline, ecurie, region, share_horse_index, avatar_url, horse_index_mode)")
    .eq("horses.share_horse_index", true)
    .order("score", { ascending: false })
    .limit(300);

  // Dédupliquer : garder le score le plus récent par cheval
  const seenHorses = new Set<string>();
  const scores = ((rawScores as ScoreWithHorse[] | null) || []).filter((s) => {
    const horseId = s.horses?.id;
    if (!horseId || seenHorses.has(horseId)) return false;
    seenHorses.add(horseId);
    return true;
  });

  // Filtres
  const discipline = searchParams.discipline || "";
  const region = searchParams.region || "";
  const mode = searchParams.mode || "competitive"; // défaut : IC/IE uniquement

  const filtered = scores.filter((s) => {
    const horse = s.horses;
    const horseMode = horse.horse_index_mode || "IE";
    if (discipline && horse.discipline !== discipline) return false;
    if (region && !horse.region?.toLowerCase().includes(region.toLowerCase())) return false;
    // Filtre par mode (TRAV-18) — par défaut, seuls les modes compétitifs IC/IE
    if (mode === "competitive") {
      if (horseMode !== "IC" && horseMode !== "IE") return false;
    } else if (mode !== "all") {
      if (horseMode !== mode) return false;
    }
    return true;
  });

  // Listes prédéfinies pour les filtres
  const disciplines = Object.keys(DISCIPLINE_LABELS).filter((d) => d !== "Autre");
  const regions = [
    "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretagne",
    "Centre-Val de Loire", "Corse", "Grand Est", "Hauts-de-France",
    "Île-de-France", "Normandie", "Nouvelle-Aquitaine", "Occitanie",
    "Pays de la Loire", "Provence-Alpes-Côte d'Azur",
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center">
            <span className="text-white font-black text-xs">E</span>
          </div>
          <span className="font-black text-black text-base tracking-tight">EQUISTRA</span>
        </Link>
        <a href="/register" className="text-xs font-semibold text-orange hover:underline">
          Créer un compte
        </a>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Title */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-5 w-5 text-orange" />
            <h1 className="text-2xl font-black text-black">Classements</h1>
          </div>
          <p className="text-sm text-gray-400">
            {filtered.length} {filtered.length > 1 ? "chevaux" : "cheval"} classé{filtered.length > 1 ? "s" : ""} par Horse Index
          </p>
        </div>

        {/* Filters */}
        <ClassementsFilters disciplines={disciplines} regions={regions} disciplineLabels={DISCIPLINE_LABELS} />

        {/* Podium top 3 */}
        {filtered.length >= 3 && !discipline && !region && (
          <div className="grid grid-cols-3 gap-3">
            {[filtered[1], filtered[0], filtered[2]].map((s, podiumIdx) => {
              const horse = s.horses;
              const heights = ["h-24", "h-32", "h-20"];
              const medals = ["🥈", "🥇", "🥉"];
              return (
                <Link
                  key={horse.id}
                  href={`/share/${horse.id}`}
                  className={`bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-end pb-4 ${heights[podiumIdx]} hover:shadow-md transition-shadow`}
                >
                  <span className="text-xl mb-1">{medals[podiumIdx]}</span>
                  <HorseAvatar name={horse.name} photoUrl={horse.avatar_url} size="sm" rounded="full" className="mb-1" />
                  <p className="text-xs font-bold text-black truncate px-2 text-center">{horse.name}</p>
                  <div className="flex items-center gap-1">
                    <p className="text-lg font-black" style={{ color: getScoreColor(s.score) }}>{s.score}</p>
                    {s.score_breakdown?.mode && (
                      <span className="text-xs font-mono font-bold text-orange">{s.score_breakdown.mode}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Leaderboard list */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <p className="text-gray-400 text-sm">Aucun cheval pour ces filtres</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {filtered.map((s, idx) => {
              const horse = s.horses;
              const rank = idx + 1;
              return (
                <Link
                  key={horse.id}
                  href={`/share/${horse.id}`}
                  className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  {/* Rank */}
                  <div className={`w-8 text-center flex-shrink-0 ${
                    rank === 1 ? "text-yellow-500" : rank === 2 ? "text-gray-400" : rank === 3 ? "text-amber-600" : "text-gray-300"
                  }`}>
                    {rank <= 3 && !discipline && !region
                      ? <Medal className="h-5 w-5 mx-auto" />
                      : <span className="text-sm font-bold text-gray-400">{rank}</span>
                    }
                  </div>

                  {/* Horse avatar */}
                  <HorseAvatar name={horse.name} photoUrl={horse.avatar_url} size="md" />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-black truncate">{horse.name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {[(horse.discipline ? DISCIPLINE_LABELS[horse.discipline] : null) || horse.discipline, horse.ecurie, horse.region]
                        .filter(Boolean).join(" · ")}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center justify-end gap-1.5">
                      <p className="text-xl font-black" style={{ color: getScoreColor(s.score) }}>{s.score}</p>
                      {s.score_breakdown?.mode && (
                        <>
                          <span className="text-gray-300 font-light">·</span>
                          <span className="text-sm font-mono font-bold text-orange">{s.score_breakdown.mode}</span>
                        </>
                      )}
                    </div>
                    <p className="text-2xs text-gray-400">{getScoreLabel(s.score)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div className="bg-black rounded-2xl p-6 text-center">
          <p className="text-white font-black text-lg mb-1">Inscrivez votre cheval</p>
          <p className="text-gray-400 text-sm mb-4">
            Calculez son Horse Index et rejoignez le classement.
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
