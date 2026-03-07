"use client";

import { useState } from "react";
import type { TrainingSession, AIInsight } from "@/lib/supabase/types";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { Plus, Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import TrainingForm from "./TrainingForm";
import TrainingList from "./TrainingList";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Range = "30" | "90" | "180";

interface Props {
  sessions: TrainingSession[];
  horseId: string;
  latestInsight: AIInsight | null;
}

export default function TrainingDashboard({ sessions, horseId, latestInsight }: Props) {
  const router = useRouter();
  const [range, setRange] = useState<Range>("30");
  const [addOpen, setAddOpen] = useState(false);
  const [generatingInsight, setGeneratingInsight] = useState(false);

  const days = parseInt(range);
  const since = subDays(new Date(), days);

  const filtered = sessions.filter((s) => new Date(s.date) >= since);

  // Chart data: group by week or by day
  const chartData = filtered
    .reduce((acc: Record<string, { date: string; intensity: number; feeling: number; count: number }>, s) => {
      const key = format(parseISO(s.date), "dd/MM");
      if (!acc[key]) acc[key] = { date: key, intensity: 0, feeling: 0, count: 0 };
      acc[key].intensity += s.intensity;
      acc[key].feeling += s.feeling;
      acc[key].count++;
      return acc;
    }, {});

  const chartPoints = Object.values(chartData)
    .map((d) => ({
      date: d.date,
      intensity: parseFloat((d.intensity / d.count).toFixed(1)),
      feeling: parseFloat((d.feeling / d.count).toFixed(1)),
    }))
    .slice(-30);

  // Stats
  const totalSessions = filtered.length;
  const avgIntensity = filtered.length
    ? (filtered.reduce((s, t) => s + t.intensity, 0) / filtered.length).toFixed(1)
    : "—";
  const avgFeeling = filtered.length
    ? (filtered.reduce((s, t) => s + t.feeling, 0) / filtered.length).toFixed(1)
    : "—";
  const totalMinutes = filtered.reduce((s, t) => s + t.duration_min, 0);
  const totalHours = Math.floor(totalMinutes / 60);

  const generateInsight = async () => {
    setGeneratingInsight(true);
    try {
      const res = await fetch("/api/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horseId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Analyse IA générée !");
      router.refresh();
    } catch {
      toast.error("Erreur lors de la génération");
    }
    setGeneratingInsight(false);
  };

  let parsedInsight: { summary?: string; insights?: string[]; alerts?: string[] } = {};
  try {
    if (latestInsight?.content) parsedInsight = JSON.parse(latestInsight.content);
  } catch {}

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Séances", value: totalSessions, suffix: `/ ${range}j` },
          { label: "Intensité moy.", value: avgIntensity, suffix: "/ 5" },
          { label: "Ressenti moy.", value: avgFeeling, suffix: "/ 5" },
          { label: "Heures total", value: `${totalHours}h`, suffix: `${totalMinutes % 60}min` },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <span className="text-2xl font-black text-black">{stat.value}</span>
            <span className="text-2xs text-gray-400">{stat.suffix}</span>
            <span className="section-title mt-1">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-white rounded-lg p-1 shadow-card">
          {(["30", "90", "180"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                range === r ? "bg-black text-white" : "text-gray-500 hover:text-black"
              }`}
            >
              {r}j
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={generateInsight} loading={generatingInsight}>
            <Sparkles className="h-3.5 w-3.5" />
            Analyse IA
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Ajouter séance
          </Button>
        </div>
      </div>

      {/* Chart */}
      {chartPoints.length >= 3 && (
        <div className="card">
          <h3 className="font-bold text-black text-sm mb-4">Intensité & ressenti</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartPoints} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
              <YAxis domain={[1, 5]} ticks={[1, 3, 5]} tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#1A1A1A", border: "none", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#9CA3AF" }}
              />
              <Line type="monotone" dataKey="intensity" stroke="#E8440A" strokeWidth={2} dot={false} name="Intensité" />
              <Line type="monotone" dataKey="feeling" stroke="#16A34A" strokeWidth={2} dot={false} name="Ressenti" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-0.5 rounded bg-orange" /> Intensité
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-0.5 rounded bg-success" /> Ressenti
            </div>
          </div>
        </div>
      )}

      {/* AI Insight card */}
      {parsedInsight.summary && (
        <div className="card bg-orange-light border border-orange/10">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-orange text-white text-xs font-black flex items-center justify-center flex-shrink-0">
              IA
            </div>
            <div>
              <p className="text-xs font-bold text-orange mb-1.5">Analyse hebdomadaire</p>
              <p className="text-sm text-gray-700 mb-2">{parsedInsight.summary}</p>
              {parsedInsight.alerts?.map((a, i) => (
                <p key={i} className="text-xs text-danger">⚠ {a}</p>
              ))}
              {parsedInsight.insights?.slice(0, 3).map((ins, i) => (
                <p key={i} className="text-xs text-gray-600 mt-1">→ {ins}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sessions list */}
      <TrainingList sessions={filtered} horseId={horseId} />

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Nouvelle séance">
        <TrainingForm
          horseId={horseId}
          onSaved={() => { setAddOpen(false); router.refresh(); }}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>
    </div>
  );
}
