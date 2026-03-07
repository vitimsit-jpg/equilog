"use client";

import { useState } from "react";
import type { Competition, HealthRecord, Horse } from "@/lib/supabase/types";
import { Plus, Trophy } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import CompetitionForm from "./CompetitionForm";
import CompetitionCard from "./CompetitionCard";
import CompetitionChecklist from "./CompetitionChecklist";
import { useRouter } from "next/navigation";
import EmptyState from "@/components/ui/EmptyState";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  competitions: Competition[];
  healthRecords: HealthRecord[];
  horse: Horse;
}

export default function CompetitionsDashboard({ competitions, healthRecords, horse }: Props) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [checklistComp, setChecklistComp] = useState<Competition | null>(null);

  const withRank = competitions.filter((c) => c.result_rank && c.total_riders);
  const chartData = withRank
    .slice()
    .reverse()
    .map((c) => ({
      date: format(parseISO(c.date), "dd MMM", { locale: fr }),
      percentile: Math.round(((c.total_riders! - c.result_rank!) / c.total_riders!) * 100),
      event: c.event_name,
    }));

  const avgPercentile = withRank.length
    ? Math.round(withRank.reduce((s, c) => s + ((c.total_riders! - c.result_rank!) / c.total_riders!) * 100, 0) / withRank.length)
    : null;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card">
          <span className="text-2xl font-black text-black">{competitions.length}</span>
          <span className="section-title mt-1">Concours</span>
        </div>
        <div className="stat-card">
          <span className="text-2xl font-black text-black">
            {avgPercentile !== null ? `Top ${100 - avgPercentile}%` : "—"}
          </span>
          <span className="section-title mt-1">Classement moyen</span>
        </div>
        <div className="stat-card">
          <span className="text-2xl font-black text-black">
            {withRank.filter((c) => c.result_rank === 1).length}
          </span>
          <span className="section-title mt-1">Victoires</span>
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
          <EmptyState icon={Trophy} title="Aucun concours enregistré" description="Ajoutez vos résultats pour suivre votre progression." />
        </div>
      ) : (
        <div className="space-y-3">
          {competitions.map((c) => (
            <CompetitionCard
              key={c.id}
              competition={c}
              horseId={horse.id}
              onChecklist={() => setChecklistComp(c)}
            />
          ))}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Nouveau concours" size="lg">
        <CompetitionForm
          horseId={horse.id}
          onSaved={() => { setAddOpen(false); router.refresh(); }}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

      {checklistComp && (
        <Modal
          open={true}
          onClose={() => setChecklistComp(null)}
          title={`Checklist — ${checklistComp.event_name}`}
          size="md"
        >
          <CompetitionChecklist
            competition={checklistComp}
            healthRecords={healthRecords}
            horse={horse}
            onClose={() => setChecklistComp(null)}
          />
        </Modal>
      )}
    </div>
  );
}
