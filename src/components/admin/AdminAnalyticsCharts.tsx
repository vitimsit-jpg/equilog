"use client";

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid
} from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

const COLORS = ["#F97316", "#FB923C", "#FDBA74", "#FED7AA", "#FFF7ED", "#EA580C"];

interface Props {
  signups: { signup_date: string; count: number }[];
  planCounts: { name: string; value: number }[];
  typeCounts: { name: string; value: number }[];
}

const PLAN_LABELS: Record<string, string> = { starter: "Starter", pro: "Pro", ecurie: "Écurie" };
const TYPE_LABELS: Record<string, string> = {
  loisir: "Loisir",
  competition: "Compétition",
  pro: "Pro",
  gerant_cavalier: "Gérant cavalier",
  coach: "Coach",
  gerant_ecurie: "Gérant écurie",
  unknown: "Inconnu",
};

export default function AdminAnalyticsCharts({ signups, planCounts, typeCounts }: Props) {
  const signupData = signups.map((s) => ({
    date: format(parseISO(s.signup_date), "dd MMM", { locale: fr }),
    count: s.count,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Signups area chart — spans 2 cols */}
      <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-5">
        <p className="text-sm font-bold text-white mb-4">Inscriptions (30 derniers jours)</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={signupData}>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6B7280" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
              labelStyle={{ color: "#fff" }}
              itemStyle={{ color: "#F97316" }}
            />
            <Area type="monotone" dataKey="count" stroke="#F97316" strokeWidth={2} fill="url(#grad)" name="Inscriptions" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Plan distribution */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <p className="text-sm font-bold text-white mb-4">Répartition plans</p>
        <ResponsiveContainer width="100%" height={130}>
          <PieChart>
            <Pie data={planCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} paddingAngle={3}>
              {planCounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
              formatter={(value, name) => [String(value ?? ""), PLAN_LABELS[String(name)] || String(name)]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-3 space-y-1.5">
          {planCounts.map((p, i) => (
            <div key={p.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-gray-400">{PLAN_LABELS[p.name] || p.name}</span>
              </div>
              <span className="text-white font-semibold">{p.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Profile type distribution */}
      <div className="md:col-span-3 bg-white/5 border border-white/10 rounded-2xl p-5">
        <p className="text-sm font-bold text-white mb-4">Répartition profils</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={typeCounts.map((t) => ({ ...t, name: TYPE_LABELS[t.name] || t.name }))} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: "#6B7280" }} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false} width={120} />
            <Tooltip
              contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
            />
            <Bar dataKey="value" fill="#F97316" radius={[0, 6, 6, 0]} name="Utilisateurs" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
