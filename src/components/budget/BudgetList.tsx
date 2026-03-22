"use client";

import { useState } from "react";
import type { BudgetEntry } from "@/lib/supabase/types";
import { formatDate, formatCurrency, BUDGET_CATEGORY_LABELS } from "@/lib/utils";
import { Wallet, Edit2, Trash2, RefreshCw, Paperclip } from "lucide-react";
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

  const handleStopRecurring = async (id: string) => {
    if (!confirm("Arrêter la récurrence ? Les dépenses déjà générées sont conservées.")) return;
    await supabase.from("budget_entries").update({ is_recurring: false, recurrence_frequency: null }).eq("id", id);
    toast.success("Récurrence arrêtée");
    router.refresh();
  };

  if (entries.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={Wallet}
          title="Aucune dépense enregistrée"
          description="Gardez une vision claire des coûts : alimentation, soins, concours et plus."
          steps={[
            { label: "Ajouter une première dépense" },
            { label: "Catégoriser vos frais" },
            { label: "Visualiser le budget mensuel" },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="font-bold text-black text-sm mb-4">Dépenses ({entries.length})</h3>
      <div className="space-y-0">
        {entries.map((e) => {
          const isTemplate = !!e.is_recurring && !e.recurring_template_id;
          const isGenerated = !!e.recurring_template_id;
          const hasFiles = e.media_urls && e.media_urls.length > 0;

          return (
            <div key={e.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isTemplate ? "bg-orange-light" : "bg-beige"
                }`}>
                  {isTemplate ? (
                    <RefreshCw className="h-4 w-4 text-orange" />
                  ) : (
                    <Wallet className="h-4 w-4 text-gray-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-black">
                      {BUDGET_CATEGORY_LABELS[e.category] || e.category}
                    </span>
                    {isTemplate && (
                      <span className="text-2xs font-semibold text-orange bg-orange-light px-1.5 py-0.5 rounded-full">
                        ♻ Récurrent
                      </span>
                    )}
                    {isGenerated && (
                      <span className="text-2xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                        Auto
                      </span>
                    )}
                    {hasFiles && (
                      <span className="text-gray-400" title={`${e.media_urls!.length} fichier(s)`}>
                        <Paperclip className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatDate(e.date)}
                    {e.description && ` · ${e.description}`}
                    {isTemplate && e.recurrence_frequency && (
                      <> · {e.recurrence_frequency === "weekly" ? "hebdo" : e.recurrence_frequency === "monthly" ? "mensuel" : "annuel"}</>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-black">{formatCurrency(e.amount)}</span>
                {isTemplate && (
                  <button
                    onClick={() => handleStopRecurring(e.id)}
                    title="Arrêter la récurrence"
                    className="p-1 rounded hover:bg-orange-light text-gray-300 hover:text-orange transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                )}
                <button onClick={() => setEditEntry(e)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-black">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(e.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-danger">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
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
