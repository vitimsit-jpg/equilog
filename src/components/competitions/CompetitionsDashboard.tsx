"use client";

import { useState } from "react";
import type { Competition, Horse } from "@/lib/supabase/types";
import { Plus, Trophy } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import CompetitionForm from "./CompetitionForm";
import CompetitionCard from "./CompetitionCard";
import { useRouter } from "next/navigation";
import EmptyState from "@/components/ui/EmptyState";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO, differenceInDays, isAfter, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar } from "lucide-react";

interface Props {
  competitions: Competition[];
  horse: Horse;
}

export default function CompetitionsDashboard({ competitions, horse }: Props) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  const withRank = competitions.filter((c) => c.result_rank && c.total_riders);
  const chartData = withRank
    .slice()
    .reverse()
    .map((c) => ({
      date: format(parseISO(c.date), "dd MMM", { locale: fr }),
      percentile: Math.round(((c.total_riders! - c.result_rank!) / c.total_riders!) * 100),
      event: c.event_name,
    }));

  const today = startOfDay(new Date());
  const upcoming = competitions.filter((c) => isAfter(startOfDay(parseISO(c.date)), today))
    .sort((a, b) => a.date.localeCompare(b.date));
  const past = competitions.filter((c) => !isAfter(startOfDay(parseISO(c.date)), today))
    .sort((a, b) => b.date.localeCompare(a.date));

  const victories = withRank.filter((c) => c.result_rank === 1).length;
  const podiums = withRank.filter((c) => c.result_rank! <= 3).length;
  const bestResult = withRank.length
    ? withRank.reduce((best, c) => {
        const pct = ((c.total_riders! - c.result_rank!) / c.total_riders!) * 100;
        return pct > ((best.total_riders! - best.result_rank!) / best.total_riders!) * 100 ? c : best;
      })
    : null;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card">
          <span className="text-2xl font-black text-black">{competitions.length}</span>
          <span className="section-title mt-1">Concours</span>
        </div>
        <div className="stat-card">
          <span className="text-2xl font-black text-black">{victories}</span>
          <span className="section-title mt-1">Victoires 🥇</span>
        </div>
        <div className="stat-card">
          <span className="text-2xl font-black text-black">{podiums}</span>
          <span className="section-title mt-1">Podiums 🏆</span>
        </div>
        <div className="stat-card">
          <span className="text-2xl font-black text-black">
            {bestResult ? `${bestResult.result_rank}/${bestResult.total_riders}` : "—"}
          </span>
          <span className="section-title mt-1">Meilleur résultat</span>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Ajouter un concours
        </Button>
      </div>

      {/* Progress chart */}
      {chartData.length >= 2 && (
        <div className="card">
          <h3 className="font-bold text-black text-sm mb-4">Courbe de progression</h3>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} ticks={[0, 50, 100]} />
              <Tooltip
                contentStyle={{ background: "#1A1A1A", border: "none", borderRadius: 8, fontSize: 12 }}
                formatter={(value) => [`Top ${100 - (Number(value) || 0)}%`, "Classement"]}
              />
              <Line type="monotone" dataKey="percentile" stroke="#E8440A" strokeWidth={2} dot={{ r: 4, fill: "#E8440A" }} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 text-center mt-1">Plus la courbe monte, meilleur est le classement</p>
        </div>
      )}

      {/* Competition list */}
      {competitions.length === 0 ? (
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
      ) : (
        <div className="space-y-4">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-orange" />
                <span className="text-xs font-bold text-orange uppercase tracking-wide">À venir ({upcoming.length})</span>
              </div>
              {upcoming.map((c) => {
                const daysLeft = differenceInDays(startOfDay(parseISO(c.date)), today);
                return (
                  <div key={c.id} className="relative">
                    <div className="absolute -top-1.5 right-3 z-10">
                      <span className={`text-2xs font-bold px-2 py-0.5 rounded-full ${daysLeft <= 7 ? "bg-orange text-white" : "bg-gray-100 text-gray-600"}`}>
                        J-{daysLeft}
                      </span>
                    </div>
                    <CompetitionCard competition={c} horseId={horse.id} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Past */}
          {past.length > 0 && (
            <div className="space-y-2">
              {upcoming.length > 0 && (
                <div className="flex items-center gap-2">
                  <Trophy className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Résultats ({past.length})</span>
                </div>
              )}
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
