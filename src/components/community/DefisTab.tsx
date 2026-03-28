"use client";

import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Flame, Target, Users, Calendar, CheckCircle2 } from "lucide-react";

const TYPE_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  volume:     { label: "Volume",     emoji: "💪", color: "bg-orange-light text-orange" },
  regularite: { label: "Régularité", emoji: "🔥", color: "bg-orange-50 text-orange-700" },
  discipline: { label: "Discipline", emoji: "🎯", color: "bg-purple-50 text-purple-700" },
  collectif:  { label: "Collectif",  emoji: "👥", color: "bg-green-50 text-green-700" },
};

const SCOPE_LABEL: Record<string, string> = {
  national: "National",
  ecurie:   "Mon écurie",
  suivis:   "Mes suivis",
};

interface Challenge {
  id: string;
  name: string;
  description: string | null;
  type: string;
  objective_value: number;
  discipline_type: string | null;
  start_date: string;
  end_date: string;
  scope: string;
  is_national: boolean;
  progress: number;
  participation: { status: string } | null;
}

interface Props {
  challenges: Challenge[];
  userHorseId: string | null;
}

export default function DefisTab({ challenges, userHorseId }: Props) {
  const [localState, setLocalState] = useState<Record<string, { joined: boolean; loading: boolean }>>({});

  const getState = (challenge: Challenge) => {
    const local = localState[challenge.id];
    if (local !== undefined) return local;
    return { joined: !!challenge.participation, loading: false };
  };

  const handleToggle = async (challenge: Challenge) => {
    const state = getState(challenge);
    if (state.loading) return;

    setLocalState((prev) => ({
      ...prev,
      [challenge.id]: { joined: state.joined, loading: true },
    }));

    try {
      if (state.joined) {
        await fetch("/api/challenges", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challenge_id: challenge.id }),
        });
        setLocalState((prev) => ({ ...prev, [challenge.id]: { joined: false, loading: false } }));
      } else {
        await fetch("/api/challenges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challenge_id: challenge.id, horse_id: userHorseId }),
        });
        setLocalState((prev) => ({ ...prev, [challenge.id]: { joined: true, loading: false } }));
      }
    } catch {
      setLocalState((prev) => ({ ...prev, [challenge.id]: { joined: state.joined, loading: false } }));
    }
  };

  if (challenges.length === 0) {
    return (
      <div className="card text-center py-16">
        <div className="text-5xl mb-4">🏆</div>
        <h2 className="text-lg font-bold text-black mb-2">Aucun défi en cours</h2>
        <p className="text-sm text-gray-400 max-w-xs mx-auto">
          Les prochains défis apparaîtront ici. Revenez bientôt !
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {challenges.map((challenge) => {
        const state = getState(challenge);
        const cfg = TYPE_CONFIG[challenge.type] ?? { label: challenge.type, emoji: "🎯", color: "bg-gray-100 text-gray-600" };
        const pct = Math.min(100, Math.round((challenge.progress / challenge.objective_value) * 100));
        const completed = pct >= 100;
        const endDate = new Date(challenge.end_date);
        const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        return (
          <div key={challenge.id} className={`card p-4 space-y-3 ${completed ? "border-green-200 bg-green-50/30" : ""}`}>
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="text-2xl leading-none mt-0.5">{cfg.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-sm font-bold text-black">{challenge.name}</h3>
                  {challenge.is_national && (
                    <span className="text-2xs font-semibold px-1.5 py-0.5 rounded-full bg-orange text-white">National</span>
                  )}
                  <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                </div>
                {challenge.description && (
                  <p className="text-xs text-gray-500 leading-relaxed">{challenge.description}</p>
                )}
              </div>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(challenge.start_date), "d MMM", { locale: fr })} – {format(endDate, "d MMM", { locale: fr })}
              </span>
              {daysLeft > 0 ? (
                <span className={`font-medium ${daysLeft <= 7 ? "text-orange" : "text-gray-400"}`}>
                  {daysLeft}j restants
                </span>
              ) : (
                <span className="text-gray-300">Terminé</span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {SCOPE_LABEL[challenge.scope] ?? challenge.scope}
              </span>
            </div>

            {/* Progress */}
            {state.joined && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-gray-500">
                    <Target className="h-3.5 w-3.5" />
                    Progression
                  </span>
                  <span className={`font-bold ${completed ? "text-green-600" : "text-gray-700"}`}>
                    {challenge.progress} / {challenge.objective_value}
                    {challenge.type === "regularite" ? " sem." : " séances"}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${completed ? "bg-green-500" : "bg-orange"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {completed && (
                  <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Défi relevé ! 🎉
                  </div>
                )}
              </div>
            )}

            {/* Streak display for regularite type */}
            {challenge.type === "regularite" && !state.joined && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Flame className="h-3.5 w-3.5 text-orange opacity-60" />
                Objectif : {challenge.objective_value} semaines consécutives à {challenge.objective_value >= 4 ? "3" : "2"}+ séances
              </div>
            )}

            {/* CTA */}
            <div className="pt-1">
              {daysLeft > 0 ? (
                <button
                  onClick={() => handleToggle(challenge)}
                  disabled={state.loading || completed}
                  className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all ${
                    completed
                      ? "bg-green-100 text-green-700 cursor-default"
                      : state.joined
                      ? "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      : "btn-primary"
                  }`}
                >
                  {state.loading ? "…" : completed ? "✓ Terminé" : state.joined ? "Quitter le défi" : "Participer"}
                </button>
              ) : (
                <span className="text-xs text-gray-300">Défi terminé</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
