import Link from "next/link";
import { format, isToday, isTomorrow } from "date-fns";
import { fr } from "date-fns/locale";
import { Trophy, Heart, GraduationCap } from "lucide-react";

interface AgendaItem {
  date: string;
  type: "competition" | "health" | "cours";
  label: string;
  sub?: string;
  href: string;
}

interface Props {
  items: AgendaItem[];
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  if (isToday(d)) return "Aujourd'hui";
  if (isTomorrow(d)) return "Demain";
  return format(d, "EEEE d MMM", { locale: fr });
}

export default function AgendaSemaine({ items }: Props) {
  if (items.length === 0) return null;

  const byDate: Record<string, AgendaItem[]> = {};
  items.forEach((item) => {
    if (!byDate[item.date]) byDate[item.date] = [];
    byDate[item.date].push(item);
  });

  const ICONS = {
    competition: <Trophy className="h-3.5 w-3.5 text-orange flex-shrink-0" />,
    health: <Heart className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />,
    cours: <GraduationCap className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-black">Agenda de la semaine</h2>
        <span className="text-xs text-gray-400">{items.length} événement{items.length > 1 ? "s" : ""}</span>
      </div>
      <div className="card divide-y divide-gray-50">
        {Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, dayItems]) => (
          <div key={date} className="p-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 capitalize">
              {dayLabel(date)}
            </p>
            <div className="space-y-1.5">
              {dayItems.map((item, i) => (
                <Link key={i} href={item.href} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                  {ICONS[item.type]}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black truncate">{item.label}</p>
                    {item.sub && <p className="text-xs text-gray-400 truncate">{item.sub}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
