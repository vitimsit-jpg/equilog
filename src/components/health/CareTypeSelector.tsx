"use client";

import type { HealthType, HorseIndexMode } from "@/lib/supabase/types";
import { HEALTH_TYPE_LABELS, HEALTH_TYPE_EMOJIS } from "@/lib/utils";

const STANDARD_TYPES: HealthType[] = ["vaccin", "vermifuge", "dentiste", "osteo", "ferrage", "veterinaire", "masseuse", "autre"];
const IS_THERAPEUTIC_TYPES: HealthType[] = ["acupuncture", "physio_laser", "physio_ultrasons", "physio_tens", "pemf", "infrarouge", "cryotherapie", "thermotherapie", "pressotherapie", "ems", "bandes_repos", "etirements_passifs", "infiltrations", "mesotherapie"];
const IR_EXTRA_TYPES: HealthType[] = ["balneotherapie", "water_treadmill", "tapis_marcheur", "ondes_choc"];

/**
 * Liste filtrée par mode du cheval. IS/IR débloquent les soins thérapeutiques.
 */
export function getCareTypes(horseMode?: HorseIndexMode | null): HealthType[] {
  const types = [...STANDARD_TYPES];
  if (horseMode === "IS" || horseMode === "IR") types.push(...IS_THERAPEUTIC_TYPES);
  if (horseMode === "IR") types.push(...IR_EXTRA_TYPES);
  return types;
}

interface Props {
  selectedType: HealthType | null;
  onChange: (type: HealthType) => void;
  horseMode?: HorseIndexMode | null;
  /** Restreint à une liste explicite (override `horseMode`). Utilisé par QuickHealthModal. */
  restrictTo?: HealthType[];
  /** Label affiché au-dessus de la grille (vide = pas de label). */
  label?: string;
}

export default function CareTypeSelector({ selectedType, onChange, horseMode, restrictTo, label = "Type de soin" }: Props) {
  const types = restrictTo ?? getCareTypes(horseMode);

  return (
    <div>
      {label && (
        <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">{label}</p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {types.map((type) => {
          const isSelected = selectedType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => onChange(type)}
              className={
                "flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-semibold transition-all min-h-[64px] " +
                (isSelected
                  ? "border-orange bg-orange-light text-orange"
                  : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200")
              }
            >
              <span className="text-lg">{HEALTH_TYPE_EMOJIS[type] ?? "📋"}</span>
              <span className="leading-tight text-center">{HEALTH_TYPE_LABELS[type] ?? type}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
