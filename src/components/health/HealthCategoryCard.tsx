"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Phone, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { formatDate, daysUntil } from "@/lib/utils";
import type { HealthRecord, HealthType } from "@/lib/supabase/types";
import HealthEventModal from "@/components/health/HealthEventModal";
import MediaGallery from "@/components/media/MediaGallery";
import { createClient } from "@/lib/supabase/client";

export interface CategoryConfig {
  type: HealthType;
  label: string;
  emoji: string;
  defaultInterval: number | null;
  hidePlanning?: boolean;
}

type Status = "en_retard" | "a_venir" | "a_jour" | "a_planifier" | "non_renseigne";

function getStatus(latest: HealthRecord | null): Status {
  if (!latest) return "non_renseigne";
  if (!latest.next_date) return "a_planifier";
  const days = daysUntil(latest.next_date);
  if (days < 0) return "en_retard";
  if (days <= 30) return "a_venir";
  return "a_jour";
}

function StatusBadge({ status, daysLeft }: { status: Status; daysLeft: number | null }) {
  if (status === "en_retard") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
        En retard
      </span>
    );
  }
  if (status === "a_venir") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-orange bg-orange-light px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-orange inline-block" />
        {daysLeft === 0 ? "Aujourd'hui" : `Dans ${daysLeft}j`}
      </span>
    );
  }
  if (status === "a_jour") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        À jour
      </span>
    );
  }
  if (status === "a_planifier") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
        À planifier
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
      Non renseigné
    </span>
  );
}

interface Props {
  config: CategoryConfig;
  records: HealthRecord[];
  horseId: string;
}

export default function HealthCategoryCard({ config, records, horseId }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleRemoveNextDate = async (recordId: string) => {
    await supabase.from("health_records").update({ next_date: null }).eq("id", recordId);
    router.refresh();
  };

  const sorted = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latest = sorted[0] ?? null;
  const status = getStatus(latest);
  const daysLeft = latest?.next_date ? daysUntil(latest.next_date) : null;

  const isUrgent = status === "en_retard" || status === "a_venir";

  return (
    <>
      <div className={`card p-4 flex flex-col gap-3 ${isUrgent ? "ring-1 ring-orange/20" : ""}`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl leading-none">{config.emoji}</span>
            <span className="text-sm font-bold text-black">{config.label}</span>
          </div>
          {!config.hidePlanning && <StatusBadge status={status} daysLeft={daysLeft} />}
        </div>

        {/* Body */}
        {latest ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Dernier</span>
              <span className="text-xs font-medium text-gray-700">{formatDate(latest.date)}</span>
            </div>
            {latest.vet_name && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Praticien</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-gray-700">{latest.vet_name}</span>
                  {latest.practitioner_phone && (
                    <a
                      href={`tel:${latest.practitioner_phone}`}
                      className="text-orange hover:text-orange/80"
                      title={latest.practitioner_phone}
                    >
                      <Phone className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )}
            {latest.next_date && !config.hidePlanning && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Prochain</span>
                <span className={`text-xs font-medium ${
                  daysLeft !== null && daysLeft < 0
                    ? "text-red-600"
                    : daysLeft !== null && daysLeft <= 30
                    ? "text-orange"
                    : "text-gray-700"
                }`}>
                  {formatDate(latest.next_date)}
                  {daysLeft !== null && daysLeft >= 0 && ` (${daysLeft}j)`}
                  {daysLeft !== null && daysLeft < 0 && ` (${Math.abs(daysLeft)}j de retard)`}
                </span>
              </div>
            )}
            {latest.next_date && config.hidePlanning && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">RDV planifié</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-gray-700">{formatDate(latest.next_date)}</span>
                  <button
                    onClick={() => handleRemoveNextDate(latest.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="Supprimer ce RDV"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
            {latest.product_name && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Produit</span>
                <span className="text-xs font-medium text-gray-700">{latest.product_name}</span>
              </div>
            )}
            {latest.notes && (
              <p className="text-xs text-gray-500 italic line-clamp-2 mt-1">{latest.notes}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400">Aucun soin enregistré</p>
        )}

        {/* History toggle */}
        {sorted.length > 1 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors w-fit"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? "Masquer" : `Voir ${sorted.length - 1} autre${sorted.length > 2 ? "s" : ""}`}
          </button>
        )}

        {expanded && sorted.length > 1 && (
          <div className="border-t border-gray-50 pt-2 space-y-1.5">
            {sorted.slice(1).map((r) => (
              <div key={r.id} className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{formatDate(r.date)}</span>
                {r.vet_name && <span className="text-xs text-gray-500">{r.vet_name}</span>}
                {r.cost != null && <span className="text-xs text-gray-400">{r.cost}€</span>}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="pt-1 border-t border-gray-50 space-y-2">
          {latest && (
            <MediaGallery
              entityType="health"
              entityId={latest.id}
              horseId={horseId}
              initialMediaUrls={latest.media_urls ?? []}
            />
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdd(true)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg py-1.5 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </button>
            {latest && (
              <button
                onClick={() => setShowEdit(true)}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg py-1.5 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                Modifier
              </button>
            )}
          </div>
        </div>
      </div>

      {showAdd && (
        <HealthEventModal
          horseId={horseId}
          defaultType={config.type}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); router.refresh(); }}
        />
      )}
      {showEdit && latest && (
        <HealthEventModal
          horseId={horseId}
          defaultValues={latest}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); router.refresh(); }}
        />
      )}
    </>
  );
}
