"use client";

import { useMemo } from "react";
import { format, subDays, parseISO, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import type { HealthRecord } from "@/lib/supabase/types";
import { HEALTH_TYPE_LABELS } from "@/lib/utils";

interface Props {
  records: HealthRecord[];
}

const TYPE_COLORS: Record<string, string> = {
  vaccin: "bg-blue-500",
  vermifuge: "bg-green-500",
  ferrage: "bg-gray-500",
  dentiste: "bg-purple-500",
  osteo: "bg-pink-500",
  veterinaire: "bg-red-500",
  masseuse: "bg-yellow-500",
  autre: "bg-gray-400",
};

export default function HealthTimeline30({ records }: Props) {
  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 30 }, (_, i) => subDays(today, 29 - i));
  }, []);

  const last30 = useMemo(() => {
    const cutoff = subDays(new Date(), 30);
    return records.filter((r) => new Date(r.date) >= cutoff);
  }, [records]);

  if (last30.length === 0) return null;

  return (
    <div className="card">
      <h3 className="font-bold text-black text-sm mb-3">Soins — 30 derniers jours</h3>
      <div className="relative">
        {/* Day columns */}
        <div className="flex gap-0.5 items-end h-10">
          {days.map((day, i) => {
            const dayRecords = last30.filter((r) => isSameDay(parseISO(r.date), day));
            const isToday = isSameDay(day, new Date());
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                {dayRecords.length > 0 && (
                  <>
                    <div className="flex flex-col gap-0.5">
                      {dayRecords.map((r) => (
                        <div
                          key={r.id}
                          className={`w-full h-2 rounded-full ${TYPE_COLORS[r.type] || "bg-gray-400"}`}
                          title={`${HEALTH_TYPE_LABELS[r.type]} — ${format(parseISO(r.date), "d MMM", { locale: fr })}`}
                        />
                      ))}
                    </div>
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-2xs rounded px-1.5 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {dayRecords.map((r) => HEALTH_TYPE_LABELS[r.type]).join(", ")}
                      <br />
                      {format(parseISO(dayRecords[0].date), "d MMM", { locale: fr })}
                    </div>
                  </>
                )}
                <div className={`w-full h-1 rounded-full mt-auto ${isToday ? "bg-orange" : "bg-gray-100"}`} />
              </div>
            );
          })}
        </div>

        {/* Date labels */}
        <div className="flex justify-between mt-1">
          <span className="text-2xs text-gray-400">{format(days[0], "d MMM", { locale: fr })}</span>
          <span className="text-2xs text-orange font-semibold">Aujourd&apos;hui</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-3">
        {Array.from(new Set(last30.map((r) => r.type))).map((type) => (
          <div key={type} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${TYPE_COLORS[type] || "bg-gray-400"}`} />
            <span className="text-2xs text-gray-500">{HEALTH_TYPE_LABELS[type]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
