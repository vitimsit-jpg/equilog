"use client";

import { useState } from "react";
import type { BudgetEntry } from "@/lib/supabase/types";
import { formatDate, formatCurrency, BUDGET_CATEGORY_LABELS } from "@/lib/utils";
import { Wallet, Edit2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import BudgetForm from "./BudgetForm";
import EmptyState from "@/components/ui/EmptyState";

interface Props {
  entries: BudgetEntry[];
  horseId: string;
}

export default function BudgetList({ entries, horseId }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [editEntry, setEditEntry] = useState<BudgetEntry | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette dépense ?")) return;
    await supabase.from("budget_entries").delete().eq("id", id);
    toast.success("Dépense supprimée");
    router.refresh();
  };

  if (entries.length === 0) {
    return (
      <div className="card">
        <EmptyState icon={Wallet} title="Aucune dépense" description="Enregistrez vos dépenses pour suivre le budget de votre cheval." />
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="font-bold text-black text-sm mb-4">Dépenses ({entries.length})</h3>
      <div className="space-y-0">
        {entries.map((e) => (
          <div key={e.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-beige flex items-center justify-center flex-shrink-0">
                <Wallet className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-black">
                  {BUDGET_CATEGORY_LABELS[e.category] || e.category}
                </div>
                <div className="text-xs text-gray-400">
                  {formatDate(e.date)}{e.description && ` · ${e.description}`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-black">{formatCurrency(e.amount)}</span>
              <button onClick={() => setEditEntry(e)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-black">
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => handleDelete(e.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-danger">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editEntry && (
        <Modal open={true} onClose={() => setEditEntry(null)} title="Modifier la dépense">
          <BudgetForm
            horseId={horseId}
            defaultValues={editEntry}
            onSaved={() => { setEditEntry(null); router.refresh(); }}
            onCancel={() => setEditEntry(null)}
          />
        </Modal>
      )}
    </div>
  );
}
