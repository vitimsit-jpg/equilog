"use client";

import { useState } from "react";
import { HelpCircle, X } from "lucide-react";

interface Props {
  daysIn: number;
  window?: number; // calibration window in days (default 30, 180 for ICr)
}

export default function CalibrationBadge({ daysIn, window = 30 }: Props) {
  const [show, setShow] = useState(false);
  const remaining = window - daysIn;

  return (
    <div className="relative flex items-center gap-1">
      <span className="text-2xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
        Calibrage en cours · encore {remaining} jour{remaining > 1 ? "s" : ""}
      </span>
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="En savoir plus sur le calibrage"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {show && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShow(false)} />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-black text-white text-xs rounded-xl p-3 z-50 leading-relaxed shadow-xl">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="font-semibold text-white">Score en calibrage</p>
              <button onClick={() => setShow(false)} className="text-gray-400 hover:text-white flex-shrink-0">
                <X className="h-3 w-3" />
              </button>
            </div>
            <p className="text-gray-300">
              Le score s&apos;affine sur 30 jours au fur et à mesure que vous enregistrez des séances et des soins. Plus vous enregistrez, plus l&apos;index est précis.
            </p>
            {/* Tooltip caret */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-black" />
          </div>
        </>
      )}
    </div>
  );
}
