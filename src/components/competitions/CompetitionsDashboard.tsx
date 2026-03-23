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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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

  const withRank = competitions.filter((c) => c.result_rank && c.total_riders);

  // Chart data: percentile goes UP when rank improves
  const chartData = withRank
    .filter((c) => c.status === "passe" || !c.status)
    .slice()
    .reverse()
    .map((c) => ({
      date: format(parseISO(c.date), "dd MMM", { locale: fr }),
      percentile: Math.round(((c.total_riders! - c.result_rank!) / c.total_riders!) * 100),
      event: c.event_name,
    }));

  const today = startOfDay(new Date());

  // Status-based split: a_venir stays in "prochains" even if date passed (until user adds result)
  const upcoming = competitions
    .filter((c) => c.status === "a_venir" || (!c.status && isAfter(startOfDay(parseISO(c.date)), today)))
    .sort((a, b) => a.date.localeCompare(b.date));

  const past = competitions
    .filter((c) => c.status === "passe" || (!c.status && !isAfter(startOfDay(parseISO(c.date)), today)))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Stats
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

  // Progression: compare last 2 ranked competitions
  const sortedWithRank = [...withRank].sort((a, b) => a.date.localeCompare(b.date));
  const lastTwo = sortedWithRank.slice(-2);
  const progressionLabel = lastTwo.length >= 2
    ? (() => {
        const prev = ((lastTwo[0].total_riders! - lastTwo[0].result_rank!) / lastTwo[0].total_riders!) * 100;
        const curr = ((lastTwo[1].total_riders! - lastTwo[1].result_rank!) / lastTwo[1].total_riders!) * 100;
        return curr > prev ? "📈 En progression" : "Stable";
      })()
    : null;

  // Niveau atteint: most recent competition's level + discipline
  const latestComp = competitions.length > 0 ? competitions[0] : null;
  const niveauAtteint = latestComp
    ? `${latestComp.level} ${DISCIPLINE_LABELS[latestComp.discipline] || latestComp.discipline}`
    : null;

  return (
    <div className="space-y-4">

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Concours disputés — always */}
        <div className="stat-card">
          <span className="text-2xl font-black text-black">{competitions.length}</span>
          <span className="section-title mt-1">Concours disputés</span>
        </div>

        {/* Niveau atteint — always if competitions exist */}
        {niveauAtteint && (
          <div className="stat-card">
            <span className="text-sm font-black text-black leading-tight">{niveauAtteint}</span>
            <span className="section-title mt-1">Niveau atteint</span>
          </div>
        )}

        {/* Meilleur classement — only if ranked competitions */}
        {bestTopPct !== null && (
          <div className="stat-card">
            <span className="text-2xl font-black text-orange">Top {bestTopPct}%</span>
            <span className="section-title mt-1">Meilleur classement</span>
          </div>
        )}

        {/* Progression — only if 2+ ranked */}
        {progressionLabel && (
          <div className="stat-card">
            <span className="text-sm font-bold text-black">{progressionLabel}</span>
            <span className="section-title mt-1">Progression</span>
          </div>
        )}

        {/* Victoires — hidden when 0 */}
        {victories > 0 && (
          <div className="stat-card border-2 border-yellow-200 bg-yellow-50">
            <span className="text-2xl font-black text-black">{victories} 🥇</span>
            <span className="section-title mt-1 text-yellow-700">Victoires</span>
          </div>
        )}

        {/* Podiums — hidden when 0 */}
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

      {/* Progress chart — Top % Y-axis */}
      {chartData.length >= 2 && (
        <div className="card">
          <h3 className="font-bold text-black text-sm mb-4">Courbe de progression</h3>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                tickLine={false}
                axisLine={false}
                ticks={[0, 50, 100]}
                tickFormatter={(v) => `Top ${100 - v}%`}
              />
              <Tooltip
                contentStyle={{ background: "#1A1A1A", border: "none", borderRadius: 8, fontSize: 12 }}
                formatter={(value) => [`Top ${100 - (Number(value) || 0)}%`, "Classement"]}
              />
              <Line type="monotone" dataKey="percentile" stroke="#E8440A" strokeWidth={2} dot={{ r: 4, fill: "#E8440A" }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 text-center mt-1">Plus la courbe monte, meilleur est votre classement relatif</p>
        </div>
      )}

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

          {/* Section Historique */}
          {past.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Historique ({past.length})</span>
              </div>
              {past.map((c) => (
                <CompetitionCard key={c.id} competition={c} horseId={horse.id} />
              ))}
            </div>
          )}
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
