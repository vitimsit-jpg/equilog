"use client";

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  eventsPerDay: { date: string; count: number }[];
  topPages: { page: string; count: number }[];
  topEvents: { name: string; count: number }[];
}

const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/communaute": "Réseaux",
  "/classements": "Classements",
  "/settings": "Paramètres",
  "/mon-ecurie": "Mon Écurie",
};

function shortPage(path: string): string {
  if (PAGE_LABELS[path]) return PAGE_LABELS[path];
  if (path.includes("/health")) return "Santé";
  if (path.includes("/training")) return "Travail";
  if (path.includes("/competitions")) return "Concours";
  if (path.includes("/budget")) return "Budget";
  if (path.includes("/horses/new")) return "Nouveau cheval";
  if (path.includes("/horses/")) return "Fiche cheval";
  return path.slice(0, 20);
}

const tooltipStyle = {
  contentStyle: { background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 },
  labelStyle: { color: "#fff" },
  itemStyle: { color: "#F97316" },
};

export default function AdminBehaviorCharts({ eventsPerDay, topPages, topEvents }: Props) {
  const eventsData = eventsPerDay.map((d) => ({
    date: format(parseISO(d.date), "dd MMM", { locale: fr }),
    count: d.count,
  }));

  const pagesData = topPages.slice(0, 8).map((p) => ({
    name: shortPage(p.page),
    count: p.count,
    full: p.page,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Events per day */}
      <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-5">
        <p className="text-sm font-bold text-white mb-4">Activité dans l&apos;app (30 derniers jours)</p>
        {eventsData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={eventsData}>
              <defs>
                <linearGradient id="evGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6B7280" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="count" stroke="#F97316" strokeWidth={2} fill="url(#evGrad)" name="Événements" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-600 text-sm text-center py-8">Aucun événement enregistré — trackEvent() s&apos;activera dès les premières actions.</p>
        )}
      </div>

      {/* Top pages */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <p className="text-sm font-bold text-white mb-4">Pages les plus visitées</p>
        {pagesData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pagesData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#6B7280" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} width={90} />
              <Tooltip
                {...tooltipStyle}
                formatter={(value, _, props) => [value, props.payload?.full || ""]}
              />
              <Bar dataKey="count" fill="#F97316" radius={[0, 6, 6, 0]} name="Visites" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-600 text-sm text-center py-8">Pas encore de données de navigation.</p>
        )}
      </div>

      {/* Top events */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <p className="text-sm font-bold text-white mb-4">Top événements (7 derniers jours)</p>
        {topEvents.length > 0 ? (
          <div className="space-y-2">
            {topEvents.map((e, i) => (
              <div key={e.name} className="flex items-center gap-3">
                <span className="text-2xs text-gray-600 w-4 text-right flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-mono text-orange truncate">{e.name}</span>
                    <span className="text-xs text-white font-semibold ml-2 flex-shrink-0">{e.count}</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full">
                    <div
                      className="h-full bg-orange/60 rounded-full"
                      style={{ width: `${(e.count / topEvents[0].count) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-sm text-center py-8">Aucun événement cette semaine.</p>
        )}
      </div>
    </div>
  );
}
