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
import type { HorseScore, HorseIndexMode } from "@/lib/supabase/types";
import { getScoreColor } from "@/lib/utils";

const MODE_LABELS: Partial<Record<HorseIndexMode, string>> = {
  IC:  "Compétition",
  IE:  "Équilibre",
  IP:  "Rééducation",
  IR:  "Convalescence",
  IS:  "Retraite",
  ICr: "Croissance",
};

interface ScoreHistoryProps {
  scores: HorseScore[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LastDot(props: any) {
  const { cx, cy, index, dataLength, value, color } = props;
  if (index !== dataLength - 1) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill={color} strokeWidth={0} />
      <text x={cx + 7} y={cy + 4} fontSize={10} fontWeight="bold" fill={color}>
        {value}
      </text>
    </g>
  );
}

export default function ScoreHistory({ scores }: ScoreHistoryProps) {
  const sorted = [...scores]
    .sort((a, b) => new Date(a.computed_at).getTime() - new Date(b.computed_at).getTime())
    .slice(-90);

  const data = sorted.map((s) => ({
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

  const lastScore = data[data.length - 1]?.score ?? 0;
  const color = getScoreColor(lastScore);

  // Infer mode from latest score breakdown for legend label
  const latestMode = sorted[sorted.length - 1]?.score_breakdown?.mode as HorseIndexMode | undefined;
  const modeLabel = latestMode ? MODE_LABELS[latestMode] : null;
  const chartLabel = modeLabel ? `Évolution du score ${latestMode} — ${modeLabel}` : "Évolution du Horse Index";

  // Subsample X ticks: max 5 evenly spaced
  const tickInterval = Math.max(1, Math.floor(data.length / 4));

  return (
    <div className="space-y-2">
      <p className="text-2xs text-gray-400">{chartLabel}</p>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 8, right: 28, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#9CA3AF" }}
            tickLine={false}
            axisLine={false}
            interval={tickInterval}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#9CA3AF" }}
            tickLine={false}
            axisLine={false}
            ticks={[0, 25, 50, 75, 100]}
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
            dot={(props) => (
              <LastDot key={`dot-${props.index}`} {...props} dataLength={data.length} color={color} />
            )}
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
