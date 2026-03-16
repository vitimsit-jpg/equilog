"use client";

interface Step {
  label: string;
  count: number;
  pct: number;
}

interface Props {
  steps: Step[];
}

export default function AdminFunnelChart({ steps }: Props) {
  const maxCount = steps[0]?.count ?? 1;

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const dropFromPrev = i > 0 ? steps[i - 1].pct - step.pct : 0;
        return (
          <div key={step.label}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-white/10 text-gray-400 text-2xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-300 font-medium">{step.label}</span>
                {dropFromPrev > 0 && (
                  <span className="text-2xs text-red-400 font-semibold">−{dropFromPrev}%</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-right">
                <span className="text-xs text-gray-500">{step.count.toLocaleString("fr")}</span>
                <span className={`text-sm font-black w-12 text-right ${step.pct >= 70 ? "text-green-400" : step.pct >= 40 ? "text-orange" : "text-red-400"}`}>
                  {step.pct}%
                </span>
              </div>
            </div>
            <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${step.pct >= 70 ? "bg-green-500" : step.pct >= 40 ? "bg-orange" : "bg-red-500"}`}
                style={{ width: `${(step.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        );
      })}

      {/* Drop-off summary */}
      <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-3">
        {steps.slice(1).map((step, i) => {
          const prev = steps[i];
          const lostCount = prev.count - step.count;
          if (lostCount <= 0) return null;
          return (
            <div key={step.label} className="bg-white/5 rounded-xl p-3">
              <p className="text-2xs text-gray-500 mb-0.5">{prev.label} → {step.label}</p>
              <p className="text-base font-black text-red-400">−{lostCount.toLocaleString("fr")}</p>
              <p className="text-2xs text-gray-600">abandons</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
