"use client";

import { useState } from "react";
import { Activity } from "lucide-react";
import HorseAvatar from "@/components/ui/HorseAvatar";
import QuickStateModal from "@/components/horses/QuickStateModal";

interface HorseBasic {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface Props {
  horses: HorseBasic[];
}

export default function HorseQuickActions({ horses }: Props) {
  const [stateHorse, setStateHorse] = useState<HorseBasic | null>(null);

  if (horses.length === 0) return null;

  return (
    <>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-3.5 w-3.5 text-orange" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">État du jour</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {horses.map((horse) => (
            <button
              key={horse.id}
              type="button"
              onClick={() => setStateHorse(horse)}
              className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-white border border-gray-100 rounded-2xl hover:border-orange hover:shadow-card transition-all duration-200 min-w-[180px] active:scale-[0.98]"
            >
              <HorseAvatar name={horse.name} photoUrl={horse.avatar_url} size="xs" rounded="lg" />
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold text-black truncate">{horse.name}</p>
                <p className="text-xs text-gray-400">Enregistrer l&apos;état →</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {stateHorse && (
        <QuickStateModal
          open={true}
          onClose={() => setStateHorse(null)}
          horseId={stateHorse.id}
          horseName={stateHorse.name}
          onSaved={() => setStateHorse(null)}
        />
      )}
    </>
  );
}
