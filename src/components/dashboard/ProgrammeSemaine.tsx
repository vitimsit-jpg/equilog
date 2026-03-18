import Link from "next/link";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  isFuture,
} from "date-fns";
import { fr } from "date-fns/locale";

interface Session {
  id: string;
  horse_id: string;
  date: string;
  type: string;
  intensity: number;
}

interface Horse {
  id: string;
  name: string;
}

interface Props {
  horses: Horse[];
  sessions: Session[];
}

export default function ProgrammeSemaine({ horses, sessions }: Props) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

  // Group sessions by horse_id + date
  const sessionsByHorseDay: Record<string, Record<string, Session[]>> = {};
  for (const session of sessions) {
    if (!sessionsByHorseDay[session.horse_id]) {
      sessionsByHorseDay[session.horse_id] = {};
    }
    const dateKey = session.date.slice(0, 10);
    if (!sessionsByHorseDay[session.horse_id][dateKey]) {
      sessionsByHorseDay[session.horse_id][dateKey] = [];
    }
    sessionsByHorseDay[session.horse_id][dateKey].push(session);
  }

  // Total sessions this week
  const totalSessionsThisWeek = sessions.length;

  if (horses.length === 0) return null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-black text-sm">Programme de la semaine</h2>
        <span className="text-xs text-gray-400">
          {format(weekStart, "d", { locale: fr })}–{format(weekEnd, "d MMM", { locale: fr })}
          {totalSessionsThisWeek > 0 && (
            <span className="ml-2 text-orange font-semibold">
              {totalSessionsThisWeek} séance{totalSessionsThisWeek > 1 ? "s" : ""}
            </span>
          )}
        </span>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 mb-2">
        <div />
        {days.map((day, i) => (
          <div
            key={i}
            className={`text-center ${isToday(day) ? "font-black text-orange" : "text-gray-400"}`}
          >
            <div className="text-2xs font-bold uppercase leading-none">{DAY_LABELS[i]}</div>
            <div className="text-xs mt-0.5">{format(day, "d")}</div>
          </div>
        ))}
      </div>

      {/* Horse rows */}
      <div className="space-y-2">
        {horses.map((horse) => (
          <Link
            key={horse.id}
            href={`/horses/${horse.id}/training`}
            className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 items-center hover:opacity-70 transition-opacity"
          >
            <div className="text-xs font-semibold text-black truncate pr-2">{horse.name}</div>
            {days.map((day, i) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const daySessions = sessionsByHorseDay[horse.id]?.[dateKey] || [];
              const hasSession = daySessions.length > 0;
              const isCurrentDay = isToday(day);
              const isFutureDay = isFuture(day) && !isCurrentDay;

              return (
                <div key={i} className="flex items-center justify-center h-7">
                  {hasSession ? (
                    <div
                      className="w-3 h-3 rounded-full bg-orange"
                      title={daySessions.map((s) => s.type).join(", ")}
                    />
                  ) : isCurrentDay ? (
                    <div className="w-3 h-3 rounded-full border-2 border-orange/30" />
                  ) : isFutureDay ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-100" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                  )}
                </div>
              );
            })}
          </Link>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-50">
        <div className="w-2.5 h-2.5 rounded-full bg-orange" />
        <span className="text-2xs text-gray-400">Séance effectuée</span>
      </div>
    </div>
  );
}
