"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { Edit2, Cloud, Activity, HelpCircle, Globe, X, ArrowRight } from "lucide-react";
import type { Horse, HorseIndexMode } from "@/lib/supabase/types";
import TransitionWizard from "./TransitionWizard";
import { HORSE_MODE_LABELS, HORSE_MODE_EMOJIS } from "@/hooks/useHorseMode";

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 35 }, (_, i) => {
  const y = currentYear - i;
  return { value: String(y), label: String(y) };
});

const sexeOptions = [
  { value: "hongre", label: "Hongre" },
  { value: "jument", label: "Jument" },
  { value: "etalon", label: "Étalon" },
];

const conditionsVieOptions = [
  { value: "boxe_paddock_individuel", label: "Boxe + paddock individuel" },
  { value: "boxe_pre_collectif",      label: "Boxe + pré collectif" },
  { value: "paddock_individuel",      label: "Paddock individuel" },
  { value: "pre_collectif",           label: "Pré collectif" },
];

const assureurOptions = [
  { value: "Cavalassur",                    label: "Cavalassur" },
  { value: "Hipassur",                      label: "Hipassur" },
  { value: "Equitanet",                     label: "Equitanet" },
  { value: "Pégase Insurance",              label: "Pégase Insurance" },
  { value: "Equidassur",                    label: "Equidassur" },
  { value: "Helmett Sport / Generali",      label: "Helmett Sport / Generali" },
  { value: "Markel Equine",                 label: "Markel Equine" },
  { value: "MMA",                           label: "MMA" },
  { value: "GAN Assurances",               label: "GAN Assurances" },
  { value: "Abeille Assurances",            label: "Abeille Assurances" },
  { value: "Crédit Agricole / Pacifica",    label: "Crédit Agricole / Pacifica" },
  { value: "MAIF",                          label: "MAIF" },
  { value: "AXA",                           label: "AXA" },
  { value: "Allianz",                       label: "Allianz" },
  { value: "Autre",                         label: "Autre" },
];

const regionOptions = [
  { value: "Auvergne-Rhône-Alpes",        label: "Auvergne-Rhône-Alpes" },
  { value: "Bourgogne-Franche-Comté",     label: "Bourgogne-Franche-Comté" },
  { value: "Bretagne",                    label: "Bretagne" },
  { value: "Centre-Val de Loire",         label: "Centre-Val de Loire" },
  { value: "Corse",                       label: "Corse" },
  { value: "Grand Est",                   label: "Grand Est" },
  { value: "Hauts-de-France",             label: "Hauts-de-France" },
  { value: "Île-de-France",               label: "Île-de-France" },
  { value: "Normandie",                   label: "Normandie" },
  { value: "Nouvelle-Aquitaine",          label: "Nouvelle-Aquitaine" },
  { value: "Occitanie",                   label: "Occitanie" },
  { value: "Pays de la Loire",            label: "Pays de la Loire" },
  { value: "Provence-Alpes-Côte d'Azur", label: "Provence-Alpes-Côte d'Azur" },
];

interface Props {
  horse: Horse;
  compact?: boolean; // affiche uniquement l'icône (pas de bouton mobile plein-largeur)
}

export default function HorseEditModal({ horse, compact = false }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModeInfo, setShowModeInfo] = useState(false); // APCU-06
  const [showTransitionWizard, setShowTransitionWizard] = useState(false); // TRAV-23
  const [showNutritionConsent, setShowNutritionConsent] = useState(false); // RGPD #43

  const [form, setForm] = useState({
    name: horse.name,
    breed: horse.breed || "",
    birth_year: horse.birth_year ? String(horse.birth_year) : "",
    sexe: (horse as any).sexe || "",
    // discipline supprimée — APCU-13
    region: horse.region || "",
    ecurie: horse.ecurie || "",
    conditions_vie: (horse as any).conditions_vie || "",
    // objectif_saison supprimée — APCU-07
    maladies_chroniques: (horse as any).maladies_chroniques || "",
    assurance: (horse as any).assurance || "",
    // sire_number, fei_number supprimés — APCU-08
    tonte: (horse as any).tonte || "",
    horse_index_mode: (horse as any).horse_index_mode || "IE",
    visibility: (horse as any).visibility || "national",
  });
  const [assure, setAssure] = useState<boolean>(!!(horse as any).assurance);
  const [moduleNutrition, setModuleNutrition] = useState<boolean>(!!(horse as any).module_nutrition);

  const COUV_OPTIONS = ["Légère", "Moyenne", "Chaude"] as const;
  type CouvertureLabel = typeof COUV_OPTIONS[number];
  const initTrousseau = (): Set<CouvertureLabel> => {
    const existing = new Set<CouvertureLabel>();
    ((horse as any).trousseau || []).forEach((c: { label?: string }) => {
      const match = COUV_OPTIONS.find((o) => o.toLowerCase() === c.label?.toLowerCase());
      if (match) existing.add(match);
    });
    return existing;
  };
  const [trousseauSet, setTrousseauSet] = useState<Set<CouvertureLabel>>(initTrousseau);

  const toggleCouv = (label: CouvertureLabel) => {
    setTrousseauSet((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Le nom est requis"); return; }
    setLoading(true);

    const { error } = await supabase
      .from("horses")
      .update({
        name: form.name.trim(),
        breed: form.breed || null,
        birth_year: form.birth_year ? parseInt(form.birth_year) : null,
        // discipline supprimée — APCU-13
        region: form.region || null,
        ecurie: form.ecurie || null,
        sexe: (form.sexe as Horse["sexe"]) || null,
        conditions_vie: (form.conditions_vie as Horse["conditions_vie"]) || null,
        // objectif_saison supprimée — APCU-07
        maladies_chroniques: form.maladies_chroniques || null,
        assurance: form.assurance || null,
        // sire_number, fei_number supprimés — APCU-08
        tonte: (form.tonte as Horse["tonte"]) || null,
        horse_index_mode: form.horse_index_mode || "IE",
        ...(form.horse_index_mode !== (horse as any).horse_index_mode && {
          horse_index_mode_changed_at: new Date().toISOString(),
        }),
        trousseau: Array.from(trousseauSet).map((label) => ({ label, grammage: 0, impermeable: false })),
        module_nutrition: moduleNutrition,
        visibility: form.visibility as Horse["visibility"],
      })
      .eq("id", horse.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
      setLoading(false);
      return;
    }

    if (form.horse_index_mode !== (horse as any).horse_index_mode) {
      await fetch("/api/horse-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horseId: horse.id }),
      }).catch(() => {});
    }

    toast.success("Profil mis à jour");
    setOpen(false);
    router.refresh();
    setLoading(false);
  };

  const triggerButton = compact ? (
    <button
      onClick={() => setOpen(true)}
      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-black transition-colors"
      title="Modifier le profil"
    >
      <Edit2 className="h-4 w-4" />
    </button>
  ) : (
    <>
      {/* Desktop: icon only */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-black transition-colors"
        title="Modifier le profil"
      >
        <Edit2 className="h-4 w-4" />
      </button>
      {/* Mobile: full row button for bottom sheet */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-200 text-black text-sm font-semibold"
      >
        <Edit2 className="h-4 w-4 text-gray-500" />
        Modifier le profil
      </button>
    </>
  );

  return (
    <>
      {triggerButton}

      <Modal open={open} onClose={() => setOpen(false)} title="Modifier le profil">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nom *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Race"
              value={form.breed}
              onChange={(e) => setForm({ ...form, breed: e.target.value })}
              placeholder="Selle Français"
            />
            <Select
              label="Année de naissance"
              value={form.birth_year}
              onChange={(e) => setForm({ ...form, birth_year: e.target.value })}
              options={yearOptions}
              placeholder="Sélectionner"
            />
          </div>

          {/* Sexe seul — discipline supprimée APCU-13 */}
          <Select
            label="Sexe"
            value={form.sexe}
            onChange={(e) => setForm({ ...form, sexe: e.target.value })}
            options={sexeOptions}
            placeholder="Sélectionner"
          />

          <Select
            label="Conditions de vie"
            value={form.conditions_vie}
            onChange={(e) => setForm({ ...form, conditions_vie: e.target.value })}
            options={conditionsVieOptions}
            placeholder="Sélectionner"
          />

          {/* objectif_saison supprimée — APCU-07 */}

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Région"
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              options={regionOptions}
              placeholder="Sélectionner"
            />
            <Input
              label="Écurie"
              value={form.ecurie}
              onChange={(e) => setForm({ ...form, ecurie: e.target.value })}
              placeholder="Écurie du Val"
            />
          </div>

          <Textarea
            label="Maladies chroniques / antécédents"
            value={form.maladies_chroniques}
            onChange={(e) => setForm({ ...form, maladies_chroniques: e.target.value })}
            placeholder="Ex : PPID (Cushing), arthrose, fourbure récurrente..."
            rows={2}
          />

          <div>
            <p className="label mb-2">Assurance</p>
            <div className="flex gap-2 mb-2">
              {[{ val: true, label: "Oui" }, { val: false, label: "Non" }].map(({ val, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setAssure(val);
                    if (!val) setForm({ ...form, assurance: "" });
                  }}
                  className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                    assure === val
                      ? "border-orange bg-orange-light text-orange"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {assure && (
              <Select
                label=""
                value={form.assurance}
                onChange={(e) => setForm({ ...form, assurance: e.target.value })}
                options={assureurOptions}
                placeholder="Sélectionner l'assureur"
              />
            )}
          </div>

          {/* sire_number, fei_number supprimés — APCU-08 */}

          {/* ── Mode de vie (Horse Index) — TRAV-23 TransitionWizard ── */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-orange" />
              <h3 className="text-sm font-bold text-black">Mode de vie</h3>
              <span className="text-xs text-gray-400">(pour le Horse Index)</span>
              <button
                type="button"
                onClick={() => setShowModeInfo(true)}
                className="text-gray-400 hover:text-gray-600 transition-colors ml-auto"
                aria-label="En savoir plus sur le mode de vie"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </div>

            {/* Affichage du mode actuel + bouton de changement */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-orange-light border border-orange/20">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {form.horse_index_mode ? HORSE_MODE_EMOJIS[form.horse_index_mode as HorseIndexMode] : "🐴"}
                </span>
                <div>
                  <p className="text-sm font-bold text-black">
                    {form.horse_index_mode
                      ? HORSE_MODE_LABELS[form.horse_index_mode as HorseIndexMode]
                      : "Non défini"}
                  </p>
                  <p className="text-2xs text-gray-500">Mode de vie actuel</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTransitionWizard(true)}
                className="flex items-center gap-1 text-xs font-bold text-orange hover:text-orange/80 transition-colors"
              >
                Changer
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* ── Profil météo ── */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Cloud className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-bold text-black">Profil météo</h3>
              <span className="text-xs text-gray-400">(pour les recommandations couverture)</span>
            </div>

            <Select
              label="Tonte"
              value={form.tonte}
              onChange={(e) => setForm({ ...form, tonte: e.target.value })}
              options={[
                { value: "non_tondu", label: "Non tondu" },
                { value: "partielle", label: "Tonte partielle" },
                { value: "complete", label: "Tonte complète" },
              ]}
              placeholder="Sélectionner"
            />

            {/* Trousseau — APCU-11 : couleurs orange */}
            <div className="mt-4">
              <p className="label mb-1">Trousseau de couvertures</p>
              <p className="text-2xs text-gray-400 mb-2">Sélectionnez les couvertures disponibles dans votre trousseau.</p>
              <div className="flex gap-2">
                {COUV_OPTIONS.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleCouv(label)}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                      trousseauSet.has(label)
                        ? "border-orange bg-orange-light text-orange"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Visibilité & confidentialité ── */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-bold text-black">Visibilité</h3>
            </div>
            <div className="space-y-2">
              {([
                { value: "national", emoji: "🌍", label: "Classements nationaux", desc: "Votre cheval apparaît dans les classements par discipline et région" },
                { value: "stable",   emoji: "🏠", label: "Écurie uniquement",     desc: "Visible uniquement des membres de votre écurie" },
                { value: "private",  emoji: "🔒", label: "Privé",                 desc: "Aucune donnée partagée, Horse Index local uniquement" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({ ...form, visibility: opt.value })}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                    form.visibility === opt.value
                      ? "border-orange bg-orange-light"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-lg">{opt.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-black">{opt.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Modules actifs ── */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-orange" />
              <h3 className="text-sm font-bold text-black">Modules actifs</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!moduleNutrition) {
                  setShowNutritionConsent(true); // RGPD #43 — consent before activation
                } else {
                  setModuleNutrition(false);
                }
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all"
              style={{ borderColor: moduleNutrition ? "var(--color-orange, #E8670A)" : "#e5e7eb" }}
            >
              <div className="text-left">
                <p className="text-sm font-semibold text-black">🥕 Nutrition</p>
                <p className="text-xs text-gray-400">Suivi des rations et compléments alimentaires</p>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${moduleNutrition ? "bg-orange" : "bg-gray-200"}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${moduleNutrition ? "translate-x-5" : "translate-x-0"}`} />
              </div>
            </button>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      {/* APCU-06 — Infobulle Mode de vie */}
      {showModeInfo && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold text-black">Le mode de vie & Horse Index</p>
              <button onClick={() => setShowModeInfo(false)} className="text-gray-400 hover:text-black flex-shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Le mode de vie détermine le <span className="font-semibold text-black">barème d&apos;évaluation</span> de votre cheval.
            </p>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="bg-beige rounded-xl p-3">
                <p className="font-semibold text-black mb-0.5">🏆 Compétition (IC)</p>
                <p className="text-xs text-gray-500">Évalué sur la régularité d&apos;entraînement, les résultats en concours et la récupération.</p>
              </div>
              <div className="bg-beige rounded-xl p-3">
                <p className="font-semibold text-black mb-0.5">🌿 Équilibre (IE)</p>
                <p className="text-xs text-gray-500">Évalué sur l&apos;équilibre repos/travail et le bien-être général.</p>
              </div>
              <div className="bg-beige rounded-xl p-3">
                <p className="font-semibold text-black mb-0.5">💊 Convalescence (IR) · 🌸 Retraite (IS)</p>
                <p className="text-xs text-gray-500">La santé et le bien-être prédominent, l&apos;activité est pondérée à la baisse.</p>
              </div>
            </div>
            <button
              onClick={() => setShowModeInfo(false)}
              className="w-full btn-primary text-sm"
            >
              Compris
            </button>
          </div>
        </div>
      )}
      {/* TRAV-23 — TransitionWizard */}
      {showTransitionWizard && (
        <TransitionWizard
          open={showTransitionWizard}
          onClose={() => setShowTransitionWizard(false)}
          horseId={horse.id}
          horseName={form.name || horse.name}
          currentMode={(form.horse_index_mode as HorseIndexMode) || null}
        />
      )}

      {/* RGPD #43 — Nutrition consent modal */}
      {showNutritionConsent && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-light flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🥕</span>
              </div>
              <div>
                <p className="font-bold text-black text-sm">Module Nutrition</p>
                <p className="text-2xs text-gray-400">Traitement de données nutritionnelles</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Le module Nutrition enregistre les rations, compléments et apports alimentaires de votre cheval.
              Ces données sont stockées de manière sécurisée sur des serveurs européens.
            </p>
            <p className="text-2xs text-gray-400 leading-relaxed">
              Conformément au RGPD (Art. 6.1.a), vous consentez au traitement de ces données.
              Vous pouvez désactiver ce module à tout moment depuis cette page.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowNutritionConsent(false)}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-500 hover:border-gray-300 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={async () => {
                  setModuleNutrition(true);
                  setShowNutritionConsent(false);
                  const { error } = await supabase.from("horses").update({ module_nutrition: true }).eq("id", horse.id);
                  if (!error) {
                    toast.success("Module Nutrition activé !");
                    router.refresh();
                  } else {
                    toast.error("Erreur lors de l'activation");
                    setModuleNutrition(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-800 transition-colors"
              >
                Activer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
