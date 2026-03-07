"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { HorseScore } from "@/lib/supabase/types";
import { getScoreColor } from "@/lib/utils";

interface ScoreHistoryProps {
  scores: HorseScore[];
}

export default function ScoreHistory({ scores }: ScoreHistoryProps) {
  const data = [...scores]
    .sort((a, b) => new Date(a.computed_at).getTime() - new Date(b.computed_at).getTime())
    .slice(-90)
    .map((s) => ({
      date: s.computed_at,
      score: s.score,
      label: format(parseISO(s.computed_at), "d MMM", { locale: fr }),
    }));

  if (data.length < 2) {
    return (
      <div className="h-24 flex items-center justify-center text-xs text-gray-400">
        Historique disponible après 14 jours de données
      </div>
    );
  }

  const lastScore = data[data.length - 1]?.score || 0;
  const color = getScoreColor(lastScore);

  return (
    <ResponsiveContainer width="100%" height={80}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "#9CA3AF" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: "#9CA3AF" }}
          tickLine={false}
          axisLine={false}
          ticks={[0, 50, 100]}
        />
        <Tooltip
          contentStyle={{
            background: "#1A1A1A",
            border: "none",
            borderRadius: 8,
            color: "white",
            fontSize: 12,
          }}
          formatter={(value) => [`${value}/100`, "Horse Index"]}
          labelStyle={{ color: "#9CA3AF" }}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
