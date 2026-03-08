"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";
import type { AIInsight } from "@/lib/supabase/types";
import type { TrainingPlan, TrainingPlanDay } from "@/lib/claude/insights";
import { TRAINING_TYPE_LABELS } from "@/lib/utils";

const LOAD_COLORS: Record<string, string> = {
  light: "text-green-600 bg-green-50",
  moderate: "text-orange bg-orange-light",
  intense: "text-red-600 bg-red-50",
};

const LOAD_LABELS: Record<string, string> = {
  light: "Charge légère",
  moderate: "Charge modérée",
  intense: "Charge intense",
};

function IntensityDots({ intensity }: { intensity: number | null }) {
  if (!intensity) return null;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 h-2.5 rounded-full ${i < intensity ? "bg-orange" : "bg-gray-100"}`}
        />
      ))}
    </div>
  );
}

function DayCard({ day }: { day: TrainingPlanDay }) {
  const isRest = !day.type;
  return (
    <div className={`rounded-xl p-3 flex flex-col gap-1.5 min-w-[110px] flex-1 ${isRest ? "bg-gray-50 border border-gray-100" : "bg-white border border-gray-100"}`}>
      <p className="text-2xs font-bold text-gray-400 uppercase tracking-wide">{day.day.slice(0, 3)}</p>
      {isRest ? (
        <p className="text-xs font-semibold text-gray-400">Repos</p>
      ) : (
        <>
          <p className="text-xs font-bold text-black leading-tight">
            {TRAINING_TYPE_LABELS[day.type!] || day.type}
          </p>
          <p className="text-2xs text-gray-400">{day.duration_min}min</p>
          <IntensityDots intensity={day.intensity} />
        </>
      )}
      <p className="text-2xs text-gray-500 leading-tight mt-0.5">{day.focus}</p>
      {day.optional && (
        <span className="text-2xs text-gray-300 italic">optionnel</span>
      )}
    </div>
  );
}

interface Props {
  horseId: string;
  latestPlan: AIInsight | null;
}

export default function TrainingPlanCard({ horseId, latestPlan }: Props) {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<AIInsight | null>(latestPlan);
  const [error, setError] = useState<string | null>(null);

  let parsed: TrainingPlan | null = null;
  if (plan) {
    try {
      parsed = JSON.parse(plan.content);
    } catch {}
  }

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/training-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horseId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Erreur ${res.status}`);
        return;
      }
      if (data.plan) setPlan(data.plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-orange" />
          <h2 className="font-bold text-black">Plan IA de la semaine</h2>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-semibold text-orange hover:underline disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {plan ? "Régénérer" : "Générer"}
        </button>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 bg-red-50 border border-red-100 rounded-lg">
          <p className="text-xs text-red-600 font-medium">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-orange" />
          <p className="text-sm text-gray-400">Claude analyse les données de votre cheval…</p>
        </div>
      )}

      {!loading && !parsed && (
        <div className="text-center py-8">
          <p className="text-sm text-gray-400 mb-4">
            Obtenez un plan d&apos;entraînement personnalisé basé sur l&apos;historique de votre cheval, ses concours à venir et son Horse Index.
          </p>
          <button
            onClick={generate}
            className="btn-primary"
          >
            <Sparkles className="h-4 w-4" />
            Générer mon plan
          </button>
        </div>
      )}

      {!loading && parsed && (
        <div className="space-y-4">
          {/* Goal + load */}
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-gray-700 font-medium leading-snug flex-1">{parsed.week_goal}</p>
            <span className={`text-2xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${LOAD_COLORS[parsed.load_level] || "text-gray-600 bg-gray-100"}`}>
              {LOAD_LABELS[parsed.load_level] || parsed.load_level}
            </span>
          </div>

          {/* 7-day grid */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {parsed.days.map((day) => (
              <DayCard key={day.day} day={day} />
            ))}
          </div>

          {/* Notes */}
          {parsed.notes && (
            <div className="bg-orange-light border border-orange/10 rounded-xl p-3">
              <p className="text-xs text-gray-700 leading-relaxed">{parsed.notes}</p>
            </div>
          )}

          {/* Generated at */}
          <p className="text-2xs text-gray-300 text-right">
            Généré le {new Date(plan!.generated_at).toLocaleDateString("fr-FR")}
          </p>
        </div>
      )}
    </div>
  );
}
