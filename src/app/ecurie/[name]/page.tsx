import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDate, getScoreColor, getScoreLabel, TRAINING_TYPE_LABELS } from "@/lib/utils";
import { Users, Dumbbell, Trophy, TrendingUp } from "lucide-react";

interface Props {
  params: { name: string };
}

export default async function EcuriePage({ params }: Props) {
  const supabase = createClient();
  const ecurieName = decodeURIComponent(params.name);

  // Horses in this ecurie with share enabled
  const { data: horses } = await supabase
    .from("horses")
    .select("*")
    .eq("ecurie", ecurieName)
    .eq("share_horse_index", true);

  if (!horses || horses.length === 0) return notFound();

  const horseIds = horses.map((h) => h.id);

  const [{ data: allScores }, { data: recentSessions }, { data: recentComps }] = await Promise.all([
    supabase
      .from("horse_scores")
      .select("*")
      .in("horse_id", horseIds)
      .order("computed_at", { ascending: false })
      .limit(horseIds.length * 5),
    supabase
      .from("training_sessions")
      .select("*, horses!inner(name)")
      .in("horse_id", horseIds)
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .limit(20),
    supabase
      .from("competitions")
      .select("*, horses!inner(name)")
      .in("horse_id", horseIds)
      .order("date", { ascending: false })
      .limit(10),
  ]);

  // Latest score per horse
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scoreByHorse: Record<string, any> = {};
  (allScores || []).forEach((s) => {
    if (!scoreByHorse[s.horse_id]) scoreByHorse[s.horse_id] = s;
  });

  // Sort horses by score desc
  const rankedHorses = [...horses].sort((a, b) => {
    const sa = scoreByHorse[a.id]?.score ?? 0;
    const sb = scoreByHorse[b.id]?.score ?? 0;
    return sb - sa;
  });

  // Stats écurie
  const horsesWithScore = rankedHorses.filter((h) => scoreByHorse[h.id]);
  const avgScore = horsesWithScore.length
    ? Math.round(horsesWithScore.reduce((acc, h) => acc + (scoreByHorse[h.id]?.score ?? 0), 0) / horsesWithScore.length)
    : null;
  const totalSessions = recentSessions?.length ?? 0;

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link href="/classements" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center">
            <span className="text-white font-black text-xs">E</span>
          </div>
          <span className="font-black text-black text-base tracking-tight">EQUISTRA</span>
        </Link>
        <a href="/register" className="text-xs font-semibold text-orange hover:underline">
          Rejoindre l&apos;écurie
        </a>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        {/* Ecurie header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-black text-white font-black text-xl flex items-center justify-center flex-shrink-0">
              {ecurieName[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-black text-black">{ecurieName}</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {horses[0]?.region && `${horses[0].region} · `}
                {rankedHorses.length} cheval{rankedHorses.length > 1 ? "aux" : ""}
              </p>
            </div>
          </div>

          {/* Stats écurie */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { icon: Users, label: "Chevaux", value: rankedHorses.length },
              { icon: TrendingUp, label: "Score moy.", value: avgScore ?? "—" },
              { icon: Dumbbell, label: "Séances récentes", value: totalSessions },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-[#FAFAF8] rounded-xl p-3 text-center">
                <p className="text-xl font-black text-black">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Classement de l'écurie */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-bold text-black text-sm">Classement</h2>
          </div>
          {rankedHorses.map((horse, idx) => {
            const score = scoreByHorse[horse.id];
            const rank = idx + 1;
            return (
              <Link
                key={horse.id}
                href={`/share/${horse.id}`}
                className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
              >
                <span className={`w-6 text-sm font-black flex-shrink-0 ${
                  rank === 1 ? "text-yellow-500" : rank === 2 ? "text-gray-400" : rank === 3 ? "text-amber-600" : "text-gray-300"
                }`}>
                  {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : rank}
                </span>
                <div className="w-9 h-9 rounded-xl bg-black text-white font-black text-sm flex items-center justify-center flex-shrink-0">
                  {horse.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-black">{horse.name}</p>
                  <p className="text-xs text-gray-400">
                    {[horse.breed, horse.discipline].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {score ? (
                  <div className="text-right">
                    <p className="text-xl font-black" style={{ color: getScoreColor(score.score) }}>{score.score}</p>
                    <p className="text-xs text-gray-400">{getScoreLabel(score.score)}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-300 font-bold">—</p>
                )}
              </Link>
            );
          })}
        </div>

        {/* Activité récente */}
        {(recentSessions || []).length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-gray-400" />
              <h2 className="font-bold text-black text-sm">Activité récente</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {(recentSessions || []).slice(0, 8).map((s) => {
                const horseName = (s as any).horses?.name;
                return (
                  <div key={s.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-black text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                        {horseName?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-black">{horseName}</p>
                        <p className="text-xs text-gray-400">{TRAINING_TYPE_LABELS[s.type]} · {s.duration_min}min</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex gap-0.5 justify-end">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className={`w-1.5 h-3 rounded-full ${i < s.intensity ? "bg-orange" : "bg-gray-100"}`} />
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

        {/* Concours récents */}
        {(recentComps || []).length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-gray-400" />
              <h2 className="font-bold text-black text-sm">Concours récents</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {(recentComps || []).map((c) => {
                const horseName = (c as any).horses?.name;
                return (
                  <div key={c.id} className="flex items-start justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-semibold text-black">{horseName}</p>
                      <p className="text-xs text-gray-400">{c.event_name} · {c.discipline} {c.level}</p>
                      <p className="text-xs text-gray-300">{formatDate(c.date)}</p>
                    </div>
                    {c.result_rank && c.total_riders && (
                      <p className="text-sm font-black text-black">
                        {c.result_rank}<span className="text-xs font-normal text-gray-400">/{c.total_riders}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="bg-black rounded-2xl p-6 text-center">
          <p className="text-white font-black text-lg mb-1">Rejoignez {ecurieName}</p>
          <p className="text-gray-400 text-sm mb-4">
            Ajoutez votre cheval et suivez l&apos;activité de votre écurie.
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
