"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  horseName: string;
  daysSinceSession: number | null;
  hasUpcomingHealth: boolean;
  healthType?: string;
  healthDays?: number;
}

function getSuggestion(horseName: string, daysSinceSession: number | null, hasUpcomingHealth: boolean, healthType?: string, healthDays?: number): string {
  if (hasUpcomingHealth && healthDays !== undefined && healthDays <= 7) {
    return `N'oubliez pas : ${healthType} de ${horseName} dans ${healthDays}j. Pensez à préparer votre rendez-vous 🗓`;
  }
  if (daysSinceSession === null) {
    return `Commencez à suivre l'activité de ${horseName} en ajoutant votre première séance 🌿`;
  }
  if (daysSinceSession === 0) {
    return `Belle séance aujourd'hui avec ${horseName} ! Pensez à noter vos observations pendant qu'elles sont fraîches ✨`;
  }
  if (daysSinceSession <= 3) {
    return `${daysSinceSession} jour${daysSinceSession > 1 ? "s" : ""} depuis la dernière séance — ${horseName} est prêt pour reprendre 🐴`;
  }
  if (daysSinceSession <= 7) {
    return `${daysSinceSession} jours sans séance — une petite balade avec ${horseName} ferait du bien à vous deux 🌿`;
  }
  return `Ça fait ${daysSinceSession} jours — comment va ${horseName} ? Même une note rapide permet de garder le suivi 💙`;
}

const DISMISS_KEY = "equistra_suggestion_dismissed";

export default function SuggestionIA({ horseName, daysSinceSession, hasUpcomingHealth, healthType, healthDays }: Props) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    if (localStorage.getItem(DISMISS_KEY) === today) setDismissed(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString().split("T")[0]);
    setDismissed(true);
  };

  if (dismissed) return null;

  const text = getSuggestion(horseName, daysSinceSession, hasUpcomingHealth, healthType, healthDays);

  return (
    <div className="card border border-orange/15 bg-orange-light/20 p-4 flex items-start gap-3">
      <span className="text-xl flex-shrink-0">🧠</span>
      <p className="flex-1 text-sm text-gray-700 leading-relaxed">{text}</p>
      <button
        onClick={dismiss}
        className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
        title="Masquer pour aujourd'hui"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
