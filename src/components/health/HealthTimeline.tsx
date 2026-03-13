"use client";

import { useState } from "react";
import type { HealthRecord } from "@/lib/supabase/types";
import {
  formatDate,
  daysUntil,
  HEALTH_TYPE_LABELS,
  formatCurrency,
} from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import { Heart, ChevronDown, Edit2, Trash2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import EditHealthEventModal from "./EditHealthEventModal";
import EmptyState from "@/components/ui/EmptyState";

interface HealthTimelineProps {
  records: HealthRecord[];
  horseId: string;
}

const typeColors: Record<string, string> = {
  vaccin: "bg-blue-100 text-blue-600",
  vermifuge: "bg-purple-100 text-purple-600",
  dentiste: "bg-green-100 text-green-600",
  osteo: "bg-yellow-100 text-yellow-600",
  ferrage: "bg-gray-100 text-gray-600",
  autre: "bg-gray-100 text-gray-600",
};

export default function HealthTimeline({ records }: HealthTimelineProps) {
  const supabase = createClient();
  const router = useRouter();
  const [editRecord, setEditRecord] = useState<HealthRecord | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const upcoming = records.filter((r) => r.next_date && daysUntil(r.next_date) <= 30);
  const overdue = records.filter((r) => r.next_date && daysUntil(r.next_date) < 0);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet événement ?")) return;
    const { error } = await supabase.from("health_records").delete().eq("id", id);
    if (error) toast.error("Erreur lors de la suppression");
    else {
      toast.success("Événement supprimé");
      router.refresh();
    }
  };

  if (records.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={Heart}
          title="Aucun soin enregistré"
          description="Ajoutez vos vaccins, vermifuges, parages et autres soins pour suivre la santé de votre cheval."
          steps={[
            { label: "Ajouter un premier soin" },
            { label: "Planifier les prochaines visites" },
            { label: "Recevoir des rappels automatiques" },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alerts */}
      {(overdue.length > 0 || upcoming.length > 0) && (
        <div className="card border-l-4 border-warning">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-warning" />
            <h3 className="font-bold text-black text-sm">Rappels</h3>
          </div>
          <div className="space-y-2">
            {[...overdue, ...upcoming.filter((r) => daysUntil(r.next_date!) >= 0)].map((r) => {
              const days = daysUntil(r.next_date!);
              return (
                <div key={r.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{HEALTH_TYPE_LABELS[r.type]}</span>
                  <Badge variant={days < 0 ? "danger" : days <= 7 ? "danger" : "warning"}>
                    {days < 0 ? `${Math.abs(days)}j de retard` : `J-${days}`}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="card">
        <h3 className="font-bold text-black text-sm mb-5">Historique</h3>
        <div className="space-y-0">
          {records.map((record, index) => (
            <div
              key={record.id}
              className={`relative pl-8 pb-5 ${index < records.length - 1 ? "border-l-2 border-gray-100 ml-3" : ""}`}
            >
              {/* Dot */}
              <div className={`absolute left-0 -translate-x-1/2 w-4 h-4 rounded-full flex items-center justify-center ${typeColors[record.type]}`}>
                <div className="w-1.5 h-1.5 rounded-full bg-current" />
              </div>

              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-black">
                      {HEALTH_TYPE_LABELS[record.type]}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(record.date)}</span>
                    {record.vet_name && (
                      <span className="text-xs text-gray-400">· {record.vet_name}</span>
                    )}
                  </div>

                  {record.next_date && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-gray-400">
                        Prochain : {formatDate(record.next_date)}
                      </span>
                      {daysUntil(record.next_date) <= 30 && (
                        <Badge
                          variant={
                            daysUntil(record.next_date) < 0
                              ? "danger"
                              : daysUntil(record.next_date) <= 7
                              ? "danger"
                              : "warning"
                          }
                          className="text-2xs"
                        >
                          {daysUntil(record.next_date) < 0
                            ? `${Math.abs(daysUntil(record.next_date))}j retard`
                            : `J-${daysUntil(record.next_date)}`}
                        </Badge>
                      )}
                    </div>
                  )}

                  {record.notes && (
                    <button
                      onClick={() => setExpanded(expanded === record.id ? null : record.id)}
                      className="text-xs text-gray-400 hover:text-black flex items-center gap-1 mt-0.5"
                    >
                      Notes
                      <ChevronDown
                        className={`h-3 w-3 transition-transform ${expanded === record.id ? "rotate-180" : ""}`}
                      />
                    </button>
                  )}
                  {expanded === record.id && record.notes && (
                    <p className="text-xs text-gray-600 mt-1 p-2 rounded-lg bg-beige">
                      {record.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-3">
                  {record.cost && (
                    <span className="text-xs font-semibold text-gray-600">
                      {formatCurrency(record.cost)}
                    </span>
                  )}
                  <button
                    onClick={() => setEditRecord(record)}
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-black transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(record.id)}
                    className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-danger transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editRecord && (
        <EditHealthEventModal
          record={editRecord}
          onClose={() => setEditRecord(null)}
          onSaved={() => {
            setEditRecord(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
