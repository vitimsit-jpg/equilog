import { daysUntil } from "@/lib/utils";
import type { ReactNode } from "react";

interface Props {
  userName: string;
  profileType: string;
  moduleCoach: boolean;
  moduleGerant: boolean;
  overdueCount: number;
  nextHealthDays: number | null;
  nextHealthType: string | null;
  upcomingCompetition: { event_name: string; date: string } | null;
  horsesCount: number;
  quickAddSlot?: ReactNode;
  todayLabel: string;
}

const PROFILE_BADGE: Record<string, { label: string; classes: string }> = {
  loisir:      { label: "Loisir",      classes: "bg-green-100 text-green-700 border border-green-200" },
  competition: { label: "Compétition", classes: "bg-orange-light text-orange border border-orange/20" },
  pro:         { label: "Pro",         classes: "bg-blue-50 text-blue-700 border border-blue-200" },
  gerant:      { label: "Gérant",      classes: "bg-purple-50 text-purple-700 border border-purple-200" },
};

const PROFILE_DEFAULT_PHRASE: Record<string, string> = {
  loisir:      "Voici l'état de votre cheval aujourd'hui.",
  competition: "Retrouvez vos performances et préparations.",
  pro:         "Vue d'ensemble de tous vos chevaux.",
  gerant:      "Tableau de bord de votre écurie.",
};

export default function DashboardHeader({
  userName,
  profileType,
  moduleCoach,
  moduleGerant,
  overdueCount,
  nextHealthDays,
  nextHealthType,
  upcomingCompetition,
  horsesCount,
  quickAddSlot,
  todayLabel,
}: Props) {
  const today = todayLabel;

  // Compute first name
  const firstName = userName.includes(" ") ? userName.split(" ")[0] : userName.split("@")[0];

  // Contextual phrase
  let contextualPhrase: string;
  if (upcomingCompetition) {
    const days = daysUntil(upcomingCompetition.date);
    if (days >= 0 && days <= 14) {
      contextualPhrase = `Concours ${upcomingCompetition.event_name} dans J-${days} — bonne préparation !`;
    } else {
      contextualPhrase = PROFILE_DEFAULT_PHRASE[profileType] ?? PROFILE_DEFAULT_PHRASE.loisir;
    }
  } else if (overdueCount > 0) {
    contextualPhrase = `${overdueCount} soin${overdueCount > 1 ? "s" : ""} en retard — pensez à planifier.`;
  } else if (nextHealthDays !== null && nextHealthDays <= 7 && nextHealthDays >= 0) {
    contextualPhrase = "Prochain soin à prévoir cette semaine.";
  } else {
    let phrase = PROFILE_DEFAULT_PHRASE[profileType] ?? PROFILE_DEFAULT_PHRASE.loisir;
    if (profileType === "loisir" && horsesCount > 1) {
      phrase = "Voici l'état de vos chevaux aujourd'hui.";
    }
    contextualPhrase = phrase;
  }

  const profileBadge = PROFILE_BADGE[profileType] ?? PROFILE_BADGE.loisir;

  return (
    <div className="flex items-start justify-between gap-4 pt-2">
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h1 className="text-2xl font-black text-black">Bonjour {firstName} 👋</h1>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${profileBadge.classes}`}>
            {profileBadge.label}
          </span>
          {moduleCoach && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
              Coach
            </span>
          )}
          {moduleGerant && profileType !== "gerant" && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
              Gérant
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 capitalize mb-1">{today}</p>
        <p className="text-sm text-gray-600">{contextualPhrase}</p>
      </div>
      {horsesCount > 0 && quickAddSlot && (
        <div className="flex-shrink-0">
          {quickAddSlot}
        </div>
      )}
    </div>
  );
}
