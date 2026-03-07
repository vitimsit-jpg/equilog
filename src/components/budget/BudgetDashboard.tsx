"use client";

import { useState } from "react";
import type { BudgetEntry } from "@/lib/supabase/types";
import { Plus, Wallet } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import BudgetForm from "./BudgetForm";
import BudgetList from "./BudgetList";
import { useRouter } from "next/navigation";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency, BUDGET_CATEGORY_LABELS } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { fr } from "date-fns/locale";

type Period = "month" | "year" | "all";

const COLORS = ["#E8440A", "#1A1A1A", "#16A34A", "#D97706", "#7C3AED", "#0891B2", "#DB2777", "#9CA3AF"];

interface Props {
  entries: BudgetEntry[];
  horseId: string;
}

export default function BudgetDashboard({ entries, horseId }: Props) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [period, setPeriod] = useState<Period>("month");

  const now = new Date();

  const filtered = entries.filter((e) => {
    const d = new Date(e.date);
    if (period === "month") return d >= startOfMonth(now) && d <= endOfMonth(now);
    if (period === "year") return d >= startOfYear(now) && d <= endOfYear(now);
    return true;
  });

  const total = filtered.reduce((sum, e) => sum + e.amount, 0);

  // By category
  const byCategory = filtered.reduce((acc: Record<string, number>, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  const pieData = Object.entries(byCategory)
    .map(([cat, amount]) => ({
      name: BUDGET_CATEGORY_LABELS[cat] || cat,
      value: amount,
    }))
    .sort((a, b) => b.value - a.value);

  // Monthly projection from this year's data
  const thisYearEntries = entries.filter((e) => new Date(e.date) >= startOfYear(now));
  const monthsWithData = new Set(thisYearEntries.map((e) => e.date.substring(0, 7))).size;
  const annualProjection = monthsWithData > 0
    ? Math.round((thisYearEntries.reduce((s, e) => s + e.amount, 0) / monthsWithData) * 12)
    : null;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="stat-card">
          <span className="text-2xl font-black text-black">{formatCurrency(total)}</span>
          <span className="section-title mt-1">
            {period === "month" ? "Ce mois" : period === "year" ? "Cette année" : "Total"}
          </span>
        </div>
        {annualProjection && period !== "all" && (
          <div className="stat-card">
            <span className="text-2xl font-black text-black">{formatCurrency(annualProjection)}</span>
            <span className="section-title mt-1">Projection annuelle</span>
          </div>
        )}
        <div className="stat-card">
          <span className="text-2xl font-black text-black">{filtered.length}</span>
          <span className="section-title mt-1">Dépenses</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-white rounded-lg p-1 shadow-card">
          {([["month", "Mois"], ["year", "Année"], ["all", "Tout"]] as [Period, string][]).map(([p, label]) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                period === p ? "bg-black text-white" : "text-gray-500 hover:text-black"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Ajouter dépense
        </Button>
      </div>

      {/* Pie chart */}
      {pieData.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-black text-sm mb-4">Répartition par catégorie</h3>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#1A1A1A", border: "none", borderRadius: 8, fontSize: 12 }}
                    formatter={(value) => [formatCurrency(Number(value) || 0), ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-gray-600 truncate">{d.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-black ml-2">{formatCurrency(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Entries list */}
      <BudgetList entries={filtered} horseId={horseId} />

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Nouvelle dépense">
        <BudgetForm
          horseId={horseId}
          onSaved={() => { setAddOpen(false); router.refresh(); }}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>
    </div>
  );
}
