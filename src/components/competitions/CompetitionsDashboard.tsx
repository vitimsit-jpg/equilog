"use client";

import { useState } from "react";
import type { Competition, Horse } from "@/lib/supabase/types";
import { Plus, Trophy, Calendar } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import CompetitionForm from "./CompetitionForm";
import CompetitionCard from "./CompetitionCard";
import { useRouter } from "next/navigation";
import EmptyState from "@/components/ui/EmptyState";
// TRAV-28-09 — Recharts retiré (courbe masquée, remplacée par timeline)
import { format, parseISO, differenceInDays, isAfter, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { DISCIPLINE_LABELS } from "@/lib/utils";

interface Props {
  competitions: Competition[];
  horse: Horse;
  linkedSessionCompetitionIds?: Set<string>;
}

export default function CompetitionsDashboard({ competitions, horse }: Props) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  // TRAV-28-14 — Filtres historique
  const [filterDisc, setFilterDisc] = useState<string>("Tous");
  const [filterSaison, setFilterSaison] = useState<string>("Tout");

  const today = startOfDay(new Date());

  // TRAV-28-07 — Concours disputés = tous les passés (tous statuts participation)
  const allPast = competitions.filter((c) => c.status === "passe" || (!c.status && !isAfter(startOfDay(parseISO(c.date)), today)));
  // Classés uniquement pour les métriques de performance
  const classe = allPast.filter((c) => !c.statut_participation || c.statut_participation === "classe");
  const withRank = classe.filter((c) => c.result_rank && c.total_riders);

  // Status-based split
  const upcoming = competitions
    .filter((c) => c.status === "a_venir" || (!c.status && isAfter(startOfDay(parseISO(c.date)), today)))
    .sort((a, b) => a.date.localeCompare(b.date));

  const past = allPast.sort((a, b) => b.date.localeCompare(a.date));

  // Stats — classés uniquement
  const victories = withRank.filter((c) => c.result_rank === 1).length;
  const podiums = withRank.filter((c) => c.result_rank! <= 3).length;

  const bestResult = withRank.length
    ? withRank.reduce((best, c) => {
        const pct = ((c.total_riders! - c.result_rank!) / c.total_riders!) * 100;
        return pct > ((best.total_riders! - best.result_rank!) / best.total_riders!) * 100 ? c : best;
      })
    : null;

  const bestTopPct = bestResult
    ? Math.round(100 - ((bestResult.total_riders! - bestResult.result_rank!) / bestResult.total_riders!) * 100)
    : null;

  // TRAV-28-07 — Progression par discipline : 3 derniers vs 3 précédents (min 6 classés)
  const progressionByDiscipline: { discipline: string; label: string }[] = [];
  const disciplines = Array.from(new Set(withRank.map((c) => c.discipline)));
  for (const disc of disciplines) {
    const discRanked = withRank.filter((c) => c.discipline === disc).sort((a, b) => a.date.localeCompare(b.date));
    if (discRanked.length >= 6) {
      const last3 = discRanked.slice(-3);
      const prev3 = discRanked.slice(-6, -3);
      const avgLast = last3.reduce((s, c) => s + ((c.total_riders! - c.result_rank!) / c.total_riders!) * 100, 0) / 3;
      const avgPrev = prev3.reduce((s, c) => s + ((c.total_riders! - c.result_rank!) / c.total_riders!) * 100, 0) / 3;
      progressionByDiscipline.push({
        discipline: DISCIPLINE_LABELS[disc] || disc,
        label: avgLast > avgPrev ? "En progression" : "Stable",
      });
    }
  }

  // TRAV-28-07 — Niveau atteint : plus haut niveau par discipline (classés uniquement)
  const niveauParDiscipline: string[] = [];
  for (const disc of disciplines) {
    const discClasse = classe.filter((c) => c.discipline === disc && c.level);
    if (discClasse.length > 0) {
      // Le plus récent classé dans cette discipline
      const latest = discClasse.sort((a, b) => b.date.localeCompare(a.date))[0];
      niveauParDiscipline.push(`${latest.level} ${DISCIPLINE_LABELS[disc] || disc}`);
    }
  }

  return (
    <div className="space-y-4">

      {/* TRAV-28-07 — Métriques reformulées (classés uniquement sauf Disputés) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Concours disputés — tous statuts participation */}
        <div className="stat-card">
          <span className="text-2xl font-black text-black">{allPast.length}</span>
          <span className="section-title mt-1">Concours disputés</span>
        </div>

        {/* Niveau atteint — par discipline, classés uniquement */}
        {niveauParDiscipline.length > 0 && (
          <div className="stat-card">
            {niveauParDiscipline.map((n, i) => (
              <span key={i} className="text-sm font-black text-black leading-tight block">{n}</span>
            ))}
            <span className="section-title mt-1">Niveau atteint</span>
          </div>
        )}

        {/* Meilleur classement — Top %, classés uniquement */}
        {bestTopPct !== null && (
          <div className="stat-card">
            <span className="text-2xl font-black text-orange">Top {bestTopPct}%</span>
            <span className="section-title mt-1">Meilleur classement</span>
          </div>
        )}

        {/* Progression — par discipline, min 6 classés */}
        {progressionByDiscipline.map((p, i) => (
          <div key={i} className="stat-card">
            <span className="text-sm font-bold text-black">{p.label === "En progression" ? "📈" : "➡️"} {p.label}</span>
            <span className="section-title mt-1">Progression {p.discipline}</span>
          </div>
        ))}

        {/* Victoires — masqué si 0 */}
        {victories > 0 && (
          <div className="stat-card border-2 border-yellow-200 bg-yellow-50">
            <span className="text-2xl font-black text-black">{victories} 🥇</span>
            <span className="section-title mt-1 text-yellow-700">Victoires</span>
          </div>
        )}

        {/* Podiums — masqué si 0 */}
        {podiums > 0 && (
          <div className="stat-card border-2 border-amber-200 bg-amber-50">
            <span className="text-2xl font-black text-black">{podiums} 🏆</span>
            <span className="section-title mt-1 text-amber-700">Podiums</span>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Ajouter un concours
        </Button>
      </div>

      {/* TRAV-28-10 — Timeline de progression par discipline */}
      {disciplines.map((disc) => {
        const discClasse = classe
          .filter((c) => c.discipline === disc && c.level)
          .sort((a, b) => a.date.localeCompare(b.date));
        // Points = premier concours classé à chaque nouveau niveau
        const seenLevels = new Set<string>();
        const points = discClasse.filter((c) => {
          if (seenLevels.has(c.level)) return false;
          seenLevels.add(c.level);
          return true;
        });
        if (points.length === 0) return null;
        const color = disc === "CCE" ? "#1565C0" : disc === "CSO" ? "#D94F00" : disc === "Dressage" ? "#388E3C" : "#888";
        return (
          <div key={disc} className="card">
            <h3 className="font-bold text-black text-sm mb-3">
              Progression {DISCIPLINE_LABELS[disc] || disc}
            </h3>
            <div className="overflow-x-auto -mx-2 px-2">
              <div className="flex items-center gap-0 min-w-max">
                {points.map((p, i) => (
                  <div key={p.id} className="flex items-center">
                    <div className="flex flex-col items-center gap-1 w-28">
                      <div
                        className="w-4 h-4 rounded-full border-2 flex-shrink-0"
                        style={{ borderColor: color, backgroundColor: i === points.length - 1 ? color : "white" }}
                      />
                      <span className="text-xs font-bold text-gray-800 text-center leading-tight">{p.level}</span>
                      <span className="text-2xs text-gray-400 text-center">{format(parseISO(p.date), "MMM yyyy", { locale: fr })}</span>
                      {p.location && <span className="text-2xs text-gray-400 text-center">{p.location}</span>}
                    </div>
                    {i < points.length - 1 && (
                      <div className="w-8 h-0.5 flex-shrink-0 -mt-6" style={{ backgroundColor: color, opacity: 0.3 }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
            {points.length === 1 && (
              <p className="text-xs text-gray-400 mt-3 text-center">Continuez à concourir pour voir votre progression !</p>
            )}
          </div>
        );
      })}

      {/* Empty state */}
      {competitions.length === 0 && (
        <div className="card">
          <EmptyState
            icon={Trophy}
            title="Aucun concours enregistré"
            description="Retracez votre palmarès et suivez votre progression en classement."
            steps={[
              { label: "Ajouter votre premier concours" },
              { label: "Enregistrer vos classements" },
              { label: "Analyser la courbe de performance" },
            ]}
          />
        </div>
      )}

      {/* Section Prochains concours */}
      {competitions.length > 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-orange" />
              <span className="text-xs font-bold text-orange uppercase tracking-wide">Prochains concours</span>
            </div>
            {upcoming.length === 0 ? (
              <div className="card text-center py-6">
                <p className="text-2xl mb-2">🏇</p>
                <p className="text-sm text-gray-500 font-medium">Aucun concours planifié</p>
                <p className="text-xs text-gray-400 mt-0.5">Ajoute ton prochain engagement !</p>
              </div>
            ) : (
              upcoming.map((c) => {
                const daysLeft = differenceInDays(startOfDay(parseISO(c.date)), today);
                const isOverdue = daysLeft < 0;
                return (
                  <div key={c.id} className="relative">
                    <div className="absolute -top-1.5 right-3 z-10">
                      <span className={`text-2xs font-bold px-2 py-0.5 rounded-full ${
                        isOverdue ? "bg-gray-400 text-white" :
                        daysLeft <= 7 ? "bg-orange text-white" : "bg-gray-100 text-gray-600"
                      }`}>
                        {isOverdue ? `J+${Math.abs(daysLeft)}` : `J-${daysLeft}`}
                      </span>
                    </div>
                    <CompetitionCard competition={c} horseId={horse.id} />
                  </div>
                );
              })
            )}
          </div>

          {/* TRAV-28-14 — Section Historique avec filtres */}
          {past.length > 0 && (() => {
            const availableDiscs = Array.from(new Set(past.map((c) => c.discipline)));
            const availableSaisons = Array.from(new Set(past.map((c) => c.date.slice(0, 4)))).sort().reverse();
            const filtered = past
              .filter((c) => filterDisc === "Tous" || c.discipline === filterDisc)
              .filter((c) => filterSaison === "Tout" || c.date.startsWith(filterSaison));
            return (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Trophy className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Historique ({filtered.length})</span>
                </div>
                {/* Filtres */}
                <div className="flex flex-wrap gap-1.5">
                  {["Tous", ...availableDiscs].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setFilterDisc(d)}
                      className={`px-2.5 py-1 rounded-full text-2xs font-semibold transition-all ${
                        filterDisc === d ? "bg-black text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {d === "Tous" ? "Tous" : DISCIPLINE_LABELS[d] || d}
                    </button>
                  ))}
                  <span className="w-px h-5 bg-gray-200 mx-1 self-center" />
                  {["Tout", ...availableSaisons].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFilterSaison(s)}
                      className={`px-2.5 py-1 rounded-full text-2xs font-semibold transition-all ${
                        filterSaison === s ? "bg-black text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {filtered.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Aucun concours pour ces filtres</p>
                ) : (
                  filtered.map((c) => (
                    <CompetitionCard key={c.id} competition={c} horseId={horse.id} />
                  ))
                )}
              </div>
            );
          })()}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Nouveau concours" size="lg">
        <CompetitionForm
          horseId={horse.id}
          onSaved={() => { setAddOpen(false); router.refresh(); }}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>
    </div>
  );
}
