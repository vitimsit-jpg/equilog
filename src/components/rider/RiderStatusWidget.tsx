"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RiderLog } from "@/lib/supabase/types";
import RiderLogModal from "./RiderLogModal";

interface Props {
  userId: string;
  todayLog: RiderLog | null;
}

const FORME: Record<number, { emoji: string; label: string; color: string }> = {
  1: { emoji: "😴", label: "Épuisé", color: "text-blue-500" },
  2: { emoji: "😕", label: "Fatigué", color: "text-orange" },
  3: { emoji: "😐", label: "Neutre", color: "text-gray-500" },
  4: { emoji: "🙂", label: "En forme", color: "text-green-600" },
  5: { emoji: "🚀", label: "Au top", color: "text-green-700" },
};

const FATIGUE_LABELS: Record<string, string> = {
  legere: "Fatigue légère",
  moderee: "Fatigue modérée",
  elevee: "Fatigue élevée",
};

const MENTAL_LABELS: Record<string, string> = {
  motiv: "Motivé 🔥",
  neutre: "Neutre",
  fatigue: "Fatigué",
  stresse: "Stressé",
};

export default function RiderStatusWidget({ userId, todayLog }: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  const formeInfo = todayLog?.forme ? FORME[todayLog.forme] : null;

  return (
    <>
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-black text-sm">Mon état aujourd&apos;hui 🏇</h2>
          {todayLog && (
            <button
              onClick={() => setModalOpen(true)}
              className="text-xs text-gray-400 hover:text-black transition-colors font-medium"
            >
              Modifier
            </button>
          )}
        </div>

        {!todayLog ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <p className="text-sm text-gray-400 text-center">
              Vous n&apos;avez pas encore loggé votre état aujourd&apos;hui.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="btn-primary"
            >
              Logger mon état
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {formeInfo && (
              <div className="flex flex-col items-center flex-shrink-0">
                <span className="text-4xl">{formeInfo.emoji}</span>
                <span className={`text-xs font-semibold mt-1 ${formeInfo.color}`}>
                  {formeInfo.label}
                </span>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 flex-1">
              {todayLog.fatigue && (
                <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600 font-medium">
                  {FATIGUE_LABELS[todayLog.fatigue] ?? todayLog.fatigue}
                </span>
              )}
              {todayLog.mental && (
                <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600 font-medium">
                  {MENTAL_LABELS[todayLog.mental] ?? todayLog.mental}
                </span>
              )}
              {(todayLog.douleurs ?? []).length > 0 && (
                <span className="text-xs px-2 py-1 bg-red-50 text-red-500 rounded-full font-medium">
                  {(todayLog.douleurs ?? []).length} douleur{(todayLog.douleurs ?? []).length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <RiderLogModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); router.refresh(); }}
        userId={userId}
        existingLog={todayLog}
      />
    </>
  );
}
