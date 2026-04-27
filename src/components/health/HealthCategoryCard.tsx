"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EMPTY_STATE_TIPS: Partial<Record<string, string>> = {
  dentiste: "Un bilan dentaire annuel pour une mastication optimale 🦷",
  osteo: "Une séance après l'hiver pour relancer la saison en souplesse 🤲",
  masseuse: "Idéal après un effort intense ou une longue période de repos 🤲",
  vaccin: "La prévention, premier soin de votre cheval 💉",
  vermifuge: "Un vermifuge régulier, ça change tout pour l'intestin 🌿",
  ferrage: "Le suivi du pied, base de tout le travail 🔨",
  veterinaire: "Pas encore de consultation enregistrée 🩺",
};
import { Plus, Pencil, Phone, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { formatDate, daysUntil } from "@/lib/utils";
import { differenceInDays, parseISO } from "date-fns";

// Bug #3 Agathe: fallback MAX_DAYS_BY_TYPE quand next_date absent
const MAX_DAYS_BY_TYPE: Record<string, number> = {
  ferrage: 35,
  vaccin: 365,
  vermifuge: 90,
  dentiste: 365,
  osteo: 180,
  veterinaire: 180,
  masseuse: 90,
};
import type { HealthRecord, HealthType, HorseIndexMode, MarechalProfile } from "@/lib/supabase/types";
import HealthEventModal from "@/components/health/HealthEventModal";
import MarechalLogModal, { buildMarechalSummary } from "@/components/health/MarechalLogModal";
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

function getStatus(latest: HealthRecord | null, type: string): Status {
  if (!latest) return "non_renseigne";
  // Priorité 1 : next_date explicite (ex: maréchal avec recurrence_semaines)
  if (latest.next_date) {
    const days = daysUntil(latest.next_date);
    if (days < 0) return "en_retard";
    if (days <= 30) return "a_venir";
    return "a_jour";
  }
  // Priorité 2 : fallback sur MAX_DAYS_BY_TYPE (ex: ferrage = 35j)
  const maxDays = MAX_DAYS_BY_TYPE[type];
  if (!maxDays) return "a_planifier";
  const daysSinceLast = differenceInDays(new Date(), parseISO(latest.date));
  if (daysSinceLast > maxDays) return "en_retard";
  if (daysSinceLast > maxDays - 30) return "a_venir";
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

// ICr foals under this age (months) should not be shod — parage only
const ICR_MARECHAL_RESTRICTION_MONTHS = 12;

interface Props {
  config: CategoryConfig;
  records: HealthRecord[];
  horseId: string;
  marechalProfile?: MarechalProfile | null;
  horseName?: string;
  horseMode?: HorseIndexMode | null;
  horseBirthYear?: number | null;
  /** Layout compact 3 lignes — Direction C. Tap → page détail /health/[type]. */
  compact?: boolean;
}

// ── Direction C : couleurs status pour la barre gauche + bordure cercle icône ──
const STATUS_COLORS: Record<Status, { bar: string; border: string; chip: string }> = {
  a_jour:        { bar: "bg-green-500",  border: "border-green-500",  chip: "text-green-700 bg-green-50" },
  a_venir:       { bar: "bg-orange",     border: "border-orange",     chip: "text-orange bg-orange-light" },
  en_retard:     { bar: "bg-red-500",    border: "border-red-500",    chip: "text-red-600 bg-red-50" },
  a_planifier:   { bar: "bg-gray-300",   border: "border-gray-300",   chip: "text-gray-500 bg-gray-100" },
  non_renseigne: { bar: "bg-gray-200",   border: "border-gray-200",   chip: "text-gray-400 bg-gray-50" },
};

const VET_TYPES = new Set<HealthType>(["veterinaire"]);

/** Ligne 3 contextuelle (ticket §4.2). null = ligne masquée. */
function getContextualInfo(latest: HealthRecord | null, type: HealthType): string | null {
  if (!latest) return null;
  const ferrageDetail = (() => {
    if (type !== "ferrage") return null;
    const ti = latest.type_intervention;
    const tiLabel = ti === "ferrure_ortho" ? "Ferrure ortho" : ti === "parage" ? "Parage" : ti === "ferrure" ? "Ferrure" : ti === "urgence" ? "Urgence" : ti === "deferrage" ? "Déferrage" : null;
    const rep = latest.repartition_fers === "anterieurs" ? "2 devant" : latest.repartition_fers === "posterieurs" ? "2 derrière" : latest.repartition_fers === "4_fers" ? "4 fers" : null;
    const mat = latest.matiere_fer === "acier" ? "acier" : latest.matiere_fer === "aluminium" ? "alu" : latest.matiere_fer === "duplo" ? "duplo" : latest.matiere_fer === "colle" ? "collé" : null;
    const fers = [rep, mat].filter(Boolean).join(" ");
    return [tiLabel, fers || null, latest.vet_name].filter(Boolean).join(" · ");
  })();
  if (ferrageDetail) return ferrageDetail;

  switch (type) {
    case "vaccin":
      return [latest.product_name, latest.vet_name].filter(Boolean).join(" · ") || null;
    case "vermifuge":
      return latest.product_name ?? null;
    case "dentiste":
      return latest.notes?.split("\n")[0]?.slice(0, 80) ?? null;
    case "osteo":
    case "masseuse":
      return null;
    case "veterinaire":
      return [latest.notes?.split("\n")[0]?.slice(0, 60), latest.vet_name].filter(Boolean).join(" · ") || null;
    default:
      return latest.notes?.split("\n")[0]?.slice(0, 80) ?? null;
  }
}

export default function HealthCategoryCard({ config, records, horseId, marechalProfile, horseName, horseMode, horseBirthYear, compact = false }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showMarechal, setShowMarechal] = useState(false);
  const [marechalEditRecord, setMarechalEditRecord] = useState<HealthRecord | null>(null);
  const [expanded, setExpanded] = useState(false);

  const isFerrageCard = config.type === "ferrage";

  const handleRemoveNextDate = async (recordId: string) => {
    const { error } = await supabase.from("health_records").update({ next_date: null }).eq("id", recordId);
    if (!error) router.refresh();
  };

  const sorted = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latest = sorted[0] ?? null;
  const status = getStatus(latest, config.type);
  const daysLeft = latest?.next_date ? daysUntil(latest.next_date) : null;

  const isUrgent = status === "en_retard" || status === "a_venir";

  // ICr age restriction for ferrage
  const currentYear = new Date().getFullYear();
  const showIcrAgeRestriction =
    isFerrageCard &&
    horseMode === "ICr" &&
    horseBirthYear != null &&
    currentYear - horseBirthYear <= Math.floor(ICR_MARECHAL_RESTRICTION_MONTHS / 12);

  // ── Mode compact (Direction C) — tap → page détail ──────────────────────────
  if (compact) {
    const colors = STATUS_COLORS[status];
    const isVet = VET_TYPES.has(config.type);
    // Override "Vétérinaire" : barre/icône bleues quel que soit le statut (cf. ticket §3.2)
    const barClass = isVet ? "bg-blue-500" : colors.bar;
    const borderClass = isVet ? "border-blue-500" : colors.border;
    const contextLine = getContextualInfo(latest, config.type);

    // Ligne "Prochain · date (Xj)" ou fallback "Dernier · date"
    const fallbackMaxDays = MAX_DAYS_BY_TYPE[config.type];
    const computedNextDate = latest && !latest.next_date && fallbackMaxDays
      ? new Date(parseISO(latest.date).getTime() + fallbackMaxDays * 86_400_000).toISOString()
      : null;
    const displayNextDate = latest?.next_date ?? computedNextDate;
    const displayDays = displayNextDate ? daysUntil(displayNextDate) : null;
    const dateClass =
      displayDays !== null && displayDays < 0 ? "text-red-600 font-semibold" :
      displayDays !== null && displayDays <= 14 ? "text-orange font-semibold" :
      "text-gray-600";

    return (
      <button
        type="button"
        onClick={() => router.push(`/horses/${horseId}/health/${config.type}`)}
        className="w-full text-left bg-white border border-[#F5F5F5] rounded-xl flex items-stretch overflow-hidden hover:border-gray-200 transition-colors"
      >
        {/* Barre gauche 4px */}
        <span aria-hidden className={`w-1 ${barClass} flex-shrink-0`} />

        <div className="flex items-center gap-3 px-3 py-3 flex-1 min-w-0">
          {/* Icône cercle 38×38 (Direction C : bordure 2px, fond blanc) */}
          <div className={`w-[38px] h-[38px] rounded-full border-2 ${borderClass} bg-white flex items-center justify-center text-lg flex-shrink-0`}>
            {config.emoji}
          </div>

          {/* 3 lignes */}
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-black truncate">{config.label}</span>
              {!config.hidePlanning && <StatusBadge status={status} daysLeft={daysLeft} />}
            </div>
            <p className="text-xs text-gray-600 truncate">
              {latest && displayNextDate && !config.hidePlanning ? (
                <>
                  <span className="text-gray-400">Prochain · </span>
                  <span className={dateClass}>
                    {formatDate(displayNextDate)}
                    {displayDays !== null && displayDays >= 0 && ` (${displayDays}j)`}
                    {displayDays !== null && displayDays < 0 && ` (${Math.abs(displayDays)}j retard)`}
                  </span>
                </>
              ) : latest ? (
                <>
                  <span className="text-gray-400">Dernier · </span>
                  <span className="text-gray-600">{formatDate(latest.date)}</span>
                </>
              ) : (
                <span className="text-gray-400 italic">Aucun soin enregistré</span>
              )}
            </p>
            {contextLine && (
              <p className="text-xs text-gray-500 truncate">{contextLine}</p>
            )}
          </div>

          {/* Chevron */}
          <span aria-hidden className="text-gray-300 text-lg flex-shrink-0">›</span>
        </div>
      </button>
    );
  }

  // ── Mode default (legacy, expand inline) ─────────────────────────────────────
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

        {/* ICr age restriction banner */}
        {showIcrAgeRestriction && (
          <div className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-amber-50 border border-amber-200">
            <span className="text-sm flex-shrink-0">🐣</span>
            <p className="text-2xs text-amber-800 leading-relaxed">
              Ferrure déconseillée avant {ICR_MARECHAL_RESTRICTION_MONTHS} mois — préférez un parage régulier.
            </p>
          </div>
        )}

        {/* Body */}
        {latest ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Dernier</span>
              <span className="text-xs font-medium text-gray-700">{formatDate(latest.date)}</span>
            </div>
            {/* Enriched ferrage display */}
            {isFerrageCard && latest.type_intervention && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Type</span>
                <span className="text-xs font-medium text-gray-700 capitalize">{
                  latest.type_intervention === "ferrure_ortho" ? "Ferrure ortho" :
                  latest.type_intervention === "parage" ? "Parage" :
                  latest.type_intervention === "ferrure" ? "Ferrure" :
                  latest.type_intervention === "urgence" ? "Urgence" :
                  latest.type_intervention === "deferrage" ? "Déferrage" : "Autre"
                }</span>
              </div>
            )}
            {isFerrageCard && (latest.repartition_fers || latest.matiere_fer) && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Détail</span>
                <span className="text-xs font-medium text-gray-700">
                  {[
                    latest.repartition_fers === "anterieurs" ? "2 devant" :
                    latest.repartition_fers === "posterieurs" ? "2 derrière" :
                    latest.repartition_fers === "4_fers" ? "4 fers" : null,
                    latest.matiere_fer === "acier" ? "Acier" :
                    latest.matiere_fer === "aluminium" ? "Alu" :
                    latest.matiere_fer === "duplo" ? "Duplo" :
                    latest.matiere_fer === "colle" ? "Collé" :
                    latest.matiere_fer ? "Autre" : null,
                  ].filter(Boolean).join(" · ")}
                </span>
              </div>
            )}
            {latest.vet_name && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{isFerrageCard ? "Maréchal" : "Praticien"}</span>
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
            {/* Profile summary line for ferrage when no record detail */}
            {isFerrageCard && !latest.type_intervention && marechalProfile && (
              <p className="text-xs text-gray-400 italic">{buildMarechalSummary(marechalProfile)}</p>
            )}
            {latest.notes && (
              <p className="text-xs text-gray-500 italic line-clamp-2 mt-1">{latest.notes}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic leading-relaxed">
            {EMPTY_STATE_TIPS[config.type] ?? "Aucun soin enregistré"}
          </p>
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
              <div key={r.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {/* Bug #5 Agathe : badge "Effectué" figé, jamais "en retard" */}
                  <span className="text-2xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full flex-shrink-0">✓ Effectué</span>
                  <span className="text-xs text-gray-400">{formatDate(r.date)}</span>
                </div>
                {r.vet_name && <span className="text-xs text-gray-500 truncate">{r.vet_name}</span>}
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
            {isFerrageCard ? (
              <>
                {latest && (
                  <button
                    onClick={() => { setMarechalEditRecord(latest); setShowMarechal(true); }}
                    className="flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg py-1.5 px-3 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Modifier
                  </button>
                )}
                <button
                  onClick={() => { setMarechalEditRecord(null); setShowMarechal(true); }}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg py-1.5 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {latest ? "Nouveau passage" : "Ajouter"}
                </button>
              </>
            ) : latest ? (
              <button
                onClick={() => setShowEdit(true)}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg py-1.5 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                Modifier
              </button>
            ) : (
              <button
                onClick={() => setShowAdd(true)}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg py-1.5 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </button>
            )}
          </div>
        </div>
      </div>

      {showMarechal && (
        <MarechalLogModal
          open={showMarechal}
          horseId={horseId}
          horseName={horseName ?? ""}
          profile={marechalProfile ?? null}
          defaultValues={marechalEditRecord ?? undefined}
          onClose={() => { setShowMarechal(false); setMarechalEditRecord(null); }}
          onSaved={() => { setShowMarechal(false); setMarechalEditRecord(null); router.refresh(); }}
        />
      )}
      {showAdd && (
        <HealthEventModal
          horseId={horseId}
          defaultType={config.type}
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
    </>
  );
}
