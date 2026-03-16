"use client";

import Link from "next/link";
import { CheckCircle2, Circle, ChevronRight, X } from "lucide-react";
import { useState } from "react";

interface Props {
  hasHorse: boolean;
  hasHealthRecord: boolean;
  hasTrainingSession: boolean;
  hasScore: boolean;
  firstHorseId?: string;
}

const STEPS = [
  {
    key: "horse",
    label: "Créer votre cheval",
    desc: "Profil, race, discipline",
    href: (id?: string) => id ? `/horses/${id}` : "/horses/new",
  },
  {
    key: "health",
    label: "Premier soin de santé",
    desc: "Vaccin, dentiste, ferrage…",
    href: (id?: string) => id ? `/horses/${id}/health` : "/dashboard",
  },
  {
    key: "training",
    label: "Première séance de travail",
    desc: "Enregistrez une séance",
    href: (id?: string) => id ? `/horses/${id}/training` : "/dashboard",
  },
  {
    key: "score",
    label: "Calculer le Horse Index",
    desc: "Votre score IA sur 100",
    href: (id?: string) => id ? `/horses/${id}` : "/dashboard",
  },
];

export default function OnboardingChecklist({ hasHorse, hasHealthRecord, hasTrainingSession, hasScore, firstHorseId }: Props) {
  const [dismissed, setDismissed] = useState(false);

  const done: Record<string, boolean> = {
    horse: hasHorse,
    health: hasHealthRecord,
    training: hasTrainingSession,
    score: hasScore,
  };

  const completedCount = Object.values(done).filter(Boolean).length;
  const allDone = completedCount === STEPS.length;

  if (dismissed || allDone) return null;

  const pct = Math.round((completedCount / STEPS.length) * 100);

  return (
    <div className="card border-2 border-orange/20 bg-gradient-to-br from-white to-orange-light/40">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-black text-black">Bien démarrer avec Equistra</span>
            <span className="text-xs font-bold text-orange bg-orange/10 px-2 py-0.5 rounded-full">
              {completedCount}/{STEPS.length}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-gray-100 rounded-full w-48 overflow-hidden">
            <div
              className="h-full bg-orange rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-300 hover:text-gray-500 transition-colors ml-3 flex-shrink-0"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        {STEPS.map((step) => {
          const isDone = done[step.key];
          const href = step.href(firstHorseId);
          return (
            <Link
              key={step.key}
              href={isDone ? "#" : href}
              onClick={isDone ? (e) => e.preventDefault() : undefined}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                isDone
                  ? "opacity-50 cursor-default"
                  : "hover:bg-white/80 cursor-pointer group"
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-gray-300 flex-shrink-0 group-hover:text-orange transition-colors" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold leading-none ${isDone ? "line-through text-gray-400" : "text-black"}`}>
                  {step.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{step.desc}</p>
              </div>
              {!isDone && (
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-orange flex-shrink-0 transition-colors" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
