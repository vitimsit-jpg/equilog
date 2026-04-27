"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Phone, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { differenceInDays, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { formatDate, daysUntil, HEALTH_TYPE_LABELS, getHealthEmoji } from "@/lib/utils";
import type { HealthRecord, HealthType, HorseIndexMode, MarechalProfile } from "@/lib/supabase/types";
import HealthEventModal from "./HealthEventModal";
import MarechalLogModal from "./MarechalLogModal";
import MediaGallery from "@/components/media/MediaGallery";

// Récurrence par défaut en SEMAINES si le passage n'a pas de recurrence_semaines explicite.
// Aligné sur §5.2 du ticket TRAV-29.
const DEFAULT_RECURRENCE_WEEKS: Partial<Record<HealthType, number>> = {
  vaccin: 52,
  vermifuge: 13,
  dentiste: 52,
  ferrage: 5, // 35j (intervalle parage par défaut)
  osteo: 26,
};

type Status = "en_retard" | "a_venir" | "a_jour" | "a_planifier" | "non_renseigne";

function getStatus(latest: HealthRecord | null): Status {
  if (!latest) return "non_renseigne";
  if (latest.next_date) {
    const days = daysUntil(latest.next_date);
    if (days < 0) return "en_retard";
    if (days <= 14) return "a_venir";
    return "a_jour";
  }
  return "a_planifier";
}

function StatusPill({ status, daysLeft }: { status: Status; daysLeft: number | null }) {
  const map: Record<Status, { text: string; className: string }> = {
    en_retard: { text: "En retard", className: "text-red-600 bg-red-50" },
    a_venir: { text: daysLeft === 0 ? "Aujourd'hui" : `Dans ${daysLeft}j`, className: "text-orange bg-orange-light" },
    a_jour: { text: "À jour", className: "text-green-700 bg-green-50" },
    a_planifier: { text: "À planifier", className: "text-gray-500 bg-gray-100" },
    non_renseigne: { text: "Non renseigné", className: "text-gray-400 bg-gray-50" },
  };
  const { text, className } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${className}`}>
      {text}
    </span>
  );
}

interface Props {
  horseId: string;
  horseName: string;
  horseMode: HorseIndexMode | null;
  type: HealthType;
  records: HealthRecord[];
  marechalProfile: MarechalProfile | null;
}

export default function CareDetailPage({ horseId, horseName, horseMode, type, records, marechalProfile }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showMarechal, setShowMarechal] = useState(false);
  const [marechalEditRecord, setMarechalEditRecord] = useState<HealthRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const latest = records[0] ?? null;
  const status = getStatus(latest);
  const daysLeft = latest?.next_date ? daysUntil(latest.next_date) : null;
  const isFerrage = type === "ferrage";
  const label = HEALTH_TYPE_LABELS[type] ?? type;
  const emoji = getHealthEmoji(type);

  // Barre de progression cycle
  const recurrenceWeeks = (latest as any)?.recurrence_semaines ?? DEFAULT_RECURRENCE_WEEKS[type] ?? null;
  const cycleData = (() => {
    if (!latest || !recurrenceWeeks) return null;
    const joursCycle = recurrenceWeeks * 7;
    const joursEcoules = differenceInDays(new Date(), parseISO(latest.date));
    const progression = Math.min(Math.max(joursEcoules / joursCycle, 0), 1);
    const joursRestants = latest.next_date
      ? differenceInDays(parseISO(latest.next_date), new Date())
      : joursCycle - joursEcoules;
    const barColor = joursRestants <= 14 ? "bg-red-500" : "bg-orange";
    return { progression, joursRestants, barColor, joursCycle };
  })();

  const handleDelete = async () => {
    if (!latest) return;
    const { error } = await supabase.from("health_records").delete().eq("id", latest.id);
    if (error) {
      toast.error("Erreur de suppression");
      return;
    }
    toast.success("Passage supprimé");
    setConfirmDelete(false);
    router.push(`/horses/${horseId}/health`);
    router.refresh();
  };

  const handleEditClick = () => {
    if (!latest) {
      setShowAdd(true);
      return;
    }
    if (isFerrage) {
      setMarechalEditRecord(latest);
      setShowMarechal(true);
    } else {
      setShowEdit(true);
    }
  };

  // Détail de ferrage formaté pour la section "Dernier passage"
  const ferrageDetail = (() => {
    if (!latest || !isFerrage) return null;
    const ti = latest.type_intervention;
    const tiLabel = ti === "ferrure_ortho" ? "Ferrure ortho" : ti === "parage" ? "Parage" : ti === "ferrure" ? "Ferrure" : ti === "urgence" ? "Urgence" : ti === "deferrage" ? "Déferrage" : null;
    const rep = latest.repartition_fers === "anterieurs" ? "2 devant" : latest.repartition_fers === "posterieurs" ? "2 derrière" : latest.repartition_fers === "4_fers" ? "4 fers" : null;
    const mat = latest.matiere_fer === "acier" ? "Acier" : latest.matiere_fer === "aluminium" ? "Aluminium" : latest.matiere_fer === "duplo" ? "Duplo" : latest.matiere_fer === "colle" ? "Collé" : null;
    return { tiLabel, rep, mat };
  })();

  const visibleHistory = showAllHistory ? records.slice(1) : records.slice(1, 6);

  return (
    <div className="max-w-2xl mx-auto pb-8 animate-fade-in">
      {/* Header sticky */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#F5F5F5] flex items-center justify-between px-4 py-3 -mx-4 sm:-mx-0 sm:px-0">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1 text-gray-600 hover:text-black transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm">Retour</span>
        </button>
        <h1 className="text-base font-bold text-black truncate">{label}</h1>
        <button
          type="button"
          onClick={handleEditClick}
          className="text-sm font-medium text-orange hover:text-orange/80 transition-colors"
        >
          Modifier
        </button>
      </div>

      <div className="px-4 sm:px-0 space-y-5 mt-4">
        {/* Hero card */}
        <div className="bg-white border border-[#F5F5F5] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-[52px] h-[52px] rounded-full border-2 border-orange bg-white flex items-center justify-center text-2xl flex-shrink-0">
              {emoji}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-black">{label}</h2>
              <StatusPill status={status} daysLeft={daysLeft} />
            </div>
          </div>

          {/* Barre de progression cycle */}
          {cycleData && (
            <div className="mt-4">
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${cycleData.barColor} transition-all`}
                  style={{ width: `${Math.round(cycleData.progression * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {cycleData.joursRestants > 0
                  ? `${cycleData.joursRestants}j avant prochain passage`
                  : cycleData.joursRestants === 0
                  ? "Prochain passage prévu aujourd'hui"
                  : `${Math.abs(cycleData.joursRestants)}j de retard`}
                <span className="text-gray-400"> · cycle de {recurrenceWeeks}sem.</span>
              </p>
            </div>
          )}
        </div>

        {/* Section "Dernier passage" */}
        {latest ? (
          <div className="bg-white border border-[#F5F5F5] rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-3">Dernier passage</p>
            <div className="space-y-2 text-sm">
              <DetailRow label="Date" value={formatDate(latest.date)} />
              {ferrageDetail?.tiLabel && <DetailRow label="Type" value={ferrageDetail.tiLabel} />}
              {ferrageDetail && (ferrageDetail.rep || ferrageDetail.mat) && (
                <DetailRow label="Détail" value={[ferrageDetail.rep, ferrageDetail.mat].filter(Boolean).join(" · ")} />
              )}
              {latest.product_name && <DetailRow label="Produit" value={latest.product_name} />}
              {latest.vet_name && (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-gray-500 text-xs uppercase tracking-wider">{isFerrage ? "Maréchal" : "Praticien"}</span>
                  <div className="text-right flex flex-col items-end gap-0.5">
                    <span className="text-black font-medium">{latest.vet_name}</span>
                    {latest.practitioner_phone && (
                      <a
                        href={`tel:${latest.practitioner_phone}`}
                        className="inline-flex items-center gap-1 text-orange font-medium text-xs hover:text-orange/80"
                      >
                        <Phone className="h-3 w-3" />
                        {latest.practitioner_phone}
                      </a>
                    )}
                  </div>
                </div>
              )}
              {latest.cost != null && <DetailRow label="Coût" value={`${latest.cost} €`} />}
              {latest.next_date && (
                <DetailRow label="Prochain prévu" value={formatDate(latest.next_date)} />
              )}
              {latest.notes && (
                <div className="pt-2 border-t border-[#F5F5F5]">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{latest.notes}</p>
                </div>
              )}
            </div>

            {/* Médias */}
            <div className="mt-4 pt-4 border-t border-[#F5F5F5]">
              <MediaGallery
                entityType="health"
                entityId={latest.id}
                horseId={horseId}
                initialMediaUrls={latest.media_urls ?? []}
              />
            </div>
          </div>
        ) : (
          <div className="bg-white border border-[#F5F5F5] rounded-xl p-8 text-center">
            <p className="text-3xl mb-2">{emoji}</p>
            <p className="text-sm font-medium text-black mb-1">Aucun soin enregistré</p>
            <p className="text-xs text-gray-500 mb-4">Démarrez le suivi de ce soin pour ce cheval.</p>
            <button
              type="button"
              onClick={() => isFerrage ? setShowMarechal(true) : setShowAdd(true)}
              className="inline-flex items-center gap-1 text-sm font-medium text-orange hover:text-orange/80"
            >
              <Plus className="h-4 w-4" />
              Ajouter un soin
            </button>
          </div>
        )}

        {/* Historique */}
        {records.length > 1 && (
          <div className="bg-white border border-[#F5F5F5] rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-3">Historique</p>
            <div className="space-y-3">
              {visibleHistory.map((r, idx) => (
                <div key={r.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${idx === 0 ? "bg-orange" : "bg-gray-300"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-black">{formatDate(r.date)}</span>
                      {r.cost != null && <span className="text-xs text-gray-500">{r.cost} €</span>}
                    </div>
                    {(r.vet_name || r.product_name) && (
                      <p className="text-xs text-gray-500 truncate">
                        {[r.product_name, r.vet_name].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {records.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAllHistory((s) => !s)}
                className="text-xs text-gray-500 hover:text-black mt-3"
              >
                {showAllHistory ? "Masquer" : `Voir tout (${records.length - 1})`}
              </button>
            )}
          </div>
        )}

        {/* Boutons actions */}
        <div className="flex flex-col gap-2">
          {isFerrage && (
            <button
              type="button"
              onClick={() => { setMarechalEditRecord(null); setShowMarechal(true); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#F5F5F5] bg-white text-sm font-medium text-black hover:bg-gray-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nouveau passage
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange text-white text-sm font-bold hover:bg-orange/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Planifier
          </button>
        </div>

        {/* Lien suppression */}
        {latest && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-full text-center text-xs text-red-600 hover:text-red-700 py-2 inline-flex items-center justify-center gap-1"
          >
            <Trash2 className="h-3 w-3" />
            Supprimer ce passage
          </button>
        )}
      </div>

      {/* Modales */}
      {showAdd && (
        <HealthEventModal
          horseId={horseId}
          defaultType={type}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); router.refresh(); }}
          horseMode={horseMode}
        />
      )}
      {showEdit && latest && (
        <HealthEventModal
          horseId={horseId}
          defaultValues={latest}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); router.refresh(); }}
          horseMode={horseMode}
        />
      )}
      {showMarechal && (
        <MarechalLogModal
          open={showMarechal}
          horseId={horseId}
          horseName={horseName}
          profile={marechalProfile}
          defaultValues={marechalEditRecord ?? undefined}
          onClose={() => { setShowMarechal(false); setMarechalEditRecord(null); }}
          onSaved={() => { setShowMarechal(false); setMarechalEditRecord(null); router.refresh(); }}
        />
      )}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setConfirmDelete(false)}>
          <div className="bg-white rounded-xl p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold text-black mb-2">Supprimer ce passage ?</p>
            <p className="text-xs text-gray-500 mb-4">Cette action ne peut pas être annulée.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2 rounded-lg border border-[#F5F5F5] text-sm text-gray-700"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-gray-500 text-xs uppercase tracking-wider">{label}</span>
      <span className="text-black font-medium text-right">{value}</span>
    </div>
  );
}
