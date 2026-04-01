"use client";

import { getScoreColor, getScoreLabel } from "@/lib/utils";

interface HorseIndexGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  mode?: string | null;
}

export default function HorseIndexGauge({ score, size = "md", mode }: HorseIndexGaugeProps) {
  const sizes = {
    sm: { svg: 80, r: 30, stroke: 6, textSize: "text-xl" },
    md: { svg: 140, r: 54, stroke: 10, textSize: "text-4xl" },
    lg: { svg: 180, r: 70, stroke: 12, textSize: "text-5xl" },
  };

  const { svg, r, stroke, textSize } = sizes[size];

  // Semi-circle gauge: 180 degrees (π radians)
  const arcLength = Math.PI * r;
  const fillLength = (score / 100) * arcLength;
  const dashOffset = arcLength - fillLength;

  // For IS/IR modes, use a neutral color regardless of score to avoid anxiety
  const color = (mode === "IS" || mode === "IR") ? "#388E3C" : getScoreColor(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: svg, height: svg / 2 + stroke }}>
        <svg
          width={svg}
          height={svg / 2 + stroke}
          viewBox={`0 0 ${svg} ${svg / 2 + stroke}`}
        >
          {/* Background arc */}
          <path
            d={`M ${stroke / 2} ${svg / 2} A ${r} ${r} 0 0 1 ${svg - stroke / 2} ${svg / 2}`}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          {/* Score arc */}
          <path
            d={`M ${stroke / 2} ${svg / 2} A ${r} ${r} 0 0 1 ${svg - stroke / 2} ${svg / 2}`}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${arcLength}`}
            strokeDashoffset={dashOffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Score text */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
          <span className={`${textSize} font-black text-black leading-none`}>{score}</span>
          <span className="text-xs text-gray-400 font-semibold">/100</span>
        </div>
      </div>
      <div
        className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
        style={{ color, backgroundColor: color + "15" }}
      >
        {mode === "IS" ? "Bien-être" : mode === "IR" ? "Récupération" : getScoreLabel(score)}
      </div>
    </div>
  );
}
