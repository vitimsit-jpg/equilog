"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { format, addDays } from "date-fns";
import { ChevronDown, ChevronUp, X, Phone } from "lucide-react";
import type { MarechalProfile, HealthRecord, InterventionType } from "@/lib/supabase/types";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────
type RepartitionFers = "anterieurs" | "posterieurs" | "4_fers";
type MatiereFer = "acier" | "aluminium" | "duplo" | "colle" | "autre";
type ModalView = "quick_confirm" | "full_form" | "save_prompt" | "update_prompt";

interface Options {
  mortaises: boolean;
  plaques: boolean;
  rolling: boolean;
  eponges: boolean;
  extensions: boolean;
  egg_bar: boolean;
  autre: string;
}

const DEFAULT_OPTIONS: Options = {
  mortaises: false, plaques: false, rolling: false,
  eponges: false, extensions: false, egg_bar: false, autre: "",
};

const INTERVENTION_LABELS: Record<InterventionType, string> = {
  parage: "Parage", ferrure: "Ferrure", ferrure_ortho: "Ferrure ortho",
  urgence: "Urgence", deferrage: "Déferrage", autre: "Autre",
};

const RECURRENCE_OPTIONS = [
  { label: "4 sem.", value: 4 },
  { label: "5 sem.", value: 5 },
  { label: "6 sem.", value: 6 },
  { label: "7-8 sem.", value: 7 },
  { label: "Perso", value: -1 },
  { label: "Aucune", value: 0 },
];

const NEEDS_PROFILE = (t: InterventionType | null) =>
  t === "parage" || t === "ferrure" || t === "ferrure_ortho";

// ── Summary line ──────────────────────────────────────────────────────────────
export function buildMarechalSummary(profile: MarechalProfile): string {
  const parts: string[] = [];
  if (profile.type_intervention) parts.push(INTERVENTION_LABELS[profile.type_intervention]);
  const rep = profile.repartition_fers;
  if (rep === "anterieurs") parts.push("2 devant");
  else if (rep === "posterieurs") parts.push("2 derrière");
  else if (rep === "4_fers") parts.push("4 fers");
  const mat = profile.matiere_fer;
  if (mat === "acier") parts.push("Acier");
  else if (mat === "aluminium") parts.push("Aluminium");
  else if (mat === "duplo") parts.push("Duplo");
  else if (mat === "colle") parts.push("Fer collé");
  else if (mat === "autre") parts.push("Mat. autre");
  const opts = profile.options_avancees as Partial<Options> | null;
  if (opts?.mortaises) parts.push("Mortaises");
  if (opts?.egg_bar) parts.push("Egg-bar");
  if (opts?.extensions) parts.push("Extensions");
  if (profile.nom_marechal) parts.push(profile.nom_marechal);
  if (profile.recurrence_semaines) parts.push(`${profile.recurrence_semaines} sem.`);
  if (profile.cout_habituel) parts.push(`${profile.cout_habituel}€`);
  return parts.join(" · ");
}

// ── Pill helper ───────────────────────────────────────────────────────────────
function Pill({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
        active
          ? "bg-orange text-white border-orange"
          : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
      }`}
    >
      {label}
    </button>
  );
}

// ── Tile helper ───────────────────────────────────────────────────────────────
function Tile({
  label, emoji, active, onClick,
}: { label: string; emoji?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl border-2 transition-all text-xs font-semibold ${
        active
          ? "border-orange bg-orange text-white"
          : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-300"
      }`}
    >
      {emoji && <span className="text-base leading-none">{emoji}</span>}
      {label}
    </button>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  horseId: string;
  horseName: string;
  profile: MarechalProfile | null;
  defaultValues?: HealthRecord | null;
  onSaved: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MarechalLogModal({
  open, onClose, horseId, horseName, profile, defaultValues, onSaved,
}: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [addToBudget, setAddToBudget] = useState(true);
  const [view, setView] = useState<ModalView>("full_form");
  const [showOptions, setShowOptions] = useState(false);
  const [recurrenceCustom, setRecurrenceCustom] = useState("");

  // Form state
  const [typeIntervention, setTypeIntervention] = useState<InterventionType | null>(null);
  const [sousTypeUrgence, setSousTypeUrgence] = useState<string | null>(null);
  const [repartitionFers, setRepartitionFers] = useState<RepartitionFers | null>(null);
  const [matiereFer, setMatiereFer] = useState<MatiereFer | null>(null);
  const [recurrenceSemaines, setRecurrenceSemaines] = useState<number | null>(null);
  const [options, setOptions] = useState<Options>({ ...DEFAULT_OPTIONS });
  const [nomMarechal, setNomMarechal] = useState("");
  const [telMarechal, setTelMarechal] = useState("");
  const [cout, setCout] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    if (!open) return;
    if (defaultValues) {
      prefillFromRecord(defaultValues);
      setView("full_form");
    } else if (profile && profile.type_intervention && NEEDS_PROFILE(profile.type_intervention)) {
      setView("quick_confirm");
    } else {
      resetForm();
      if (profile) prefillFromProfile(profile);
      setView("full_form");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (typeIntervention === "ferrure_ortho") setShowOptions(true);
  }, [typeIntervention]);

  const prefillFromProfile = (p: MarechalProfile) => {
    if (p.type_intervention) setTypeIntervention(p.type_intervention);
    if (p.repartition_fers) setRepartitionFers(p.repartition_fers as RepartitionFers);
    if (p.matiere_fer) setMatiereFer(p.matiere_fer as MatiereFer);
    if (p.recurrence_semaines != null) {
      setRecurrenceSemaines(p.recurrence_semaines);
      if (![4, 5, 6, 7, 0].includes(p.recurrence_semaines)) {
        setRecurrenceCustom(String(p.recurrence_semaines));
      }
    }
    if (p.options_avancees) setOptions({ ...DEFAULT_OPTIONS, ...(p.options_avancees as Partial<Options>) });
    if (p.nom_marechal) setNomMarechal(p.nom_marechal);
    if (p.tel_marechal) setTelMarechal(p.tel_marechal);
    if (p.cout_habituel != null) setCout(String(p.cout_habituel));
  };

  const prefillFromRecord = (r: HealthRecord) => {
    if (r.type_intervention) setTypeIntervention(r.type_intervention as InterventionType);
    if (r.sous_type_urgence) setSousTypeUrgence(r.sous_type_urgence);
    if (r.repartition_fers) setRepartitionFers(r.repartition_fers as RepartitionFers);
    if (r.matiere_fer) setMatiereFer(r.matiere_fer as MatiereFer);
    if (r.recurrence_semaines != null) {
      setRecurrenceSemaines(r.recurrence_semaines);
      if (![4, 5, 6, 7, 0].includes(r.recurrence_semaines)) {
        setRecurrenceCustom(String(r.recurrence_semaines));
      }
    }
    if (r.options_avancees) setOptions({ ...DEFAULT_OPTIONS, ...(r.options_avancees as Partial<Options>) });
    if (r.vet_name) setNomMarechal(r.vet_name);
    if (r.practitioner_phone) setTelMarechal(r.practitioner_phone);
    if (r.cost != null) setCout(String(r.cost));
    if (r.notes) setNotes(r.notes);
    if (r.date) setDate(r.date);
  };

  const resetForm = () => {
    setTypeIntervention(null); setSousTypeUrgence(null);
    setRepartitionFers(null); setMatiereFer(null);
    setRecurrenceSemaines(null); setOptions({ ...DEFAULT_OPTIONS });
    setNomMarechal(""); setTelMarechal(""); setCout(""); setNotes("");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setShowOptions(false); setRecurrenceCustom("");
  };

  const handleClose = () => { resetForm(); onClose(); };

  const computeNextDate = (semaines: number | null, fromDate: string): string | null => {
    if (!semaines || semaines <= 0) return null;
    return format(addDays(new Date(fromDate), semaines * 7), "yyyy-MM-dd");
  };

  const buildPayload = (useProfile = false) => {
    if (useProfile && profile) {
      return {
        horse_id: horseId, type: "ferrage" as const, date,
        vet_name: profile.nom_marechal || null,
        practitioner_phone: profile.tel_marechal || null,
        cost: profile.cout_habituel ?? null,
        notes: null,
        next_date: computeNextDate(profile.recurrence_semaines, date),
        type_intervention: profile.type_intervention,
        sous_type_urgence: null,
        repartition_fers: profile.repartition_fers,
        matiere_fer: profile.matiere_fer,
        options_avancees: profile.options_avancees || {},
        recurrence_semaines: profile.recurrence_semaines,
      };
    }
    return {
      horse_id: horseId, type: "ferrage" as const, date,
      vet_name: nomMarechal || null,
      practitioner_phone: telMarechal || null,
      cost: cout ? parseFloat(cout) : null,
      notes: notes || null,
      next_date: computeNextDate(recurrenceSemaines, date),
      type_intervention: typeIntervention,
      sous_type_urgence: typeIntervention === "urgence" ? sousTypeUrgence : null,
      repartition_fers: repartitionFers,
      matiere_fer: matiereFer,
      options_avancees: options,
      recurrence_semaines: recurrenceSemaines,
    };
  };

  const saveProfileData = async (data: typeof options & {
    type_intervention: InterventionType | null;
    repartition_fers: RepartitionFers | null;
    matiere_fer: MatiereFer | null;
    nom_marechal: string;
    tel_marechal: string;
    cout: string;
    recurrence_semaines: number | null;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("horse_marechal_profile").upsert({
      horse_id: horseId, user_id: user.id,
      type_intervention: data.type_intervention,
      repartition_fers: data.repartition_fers,
      matiere_fer: data.matiere_fer,
      options_avancees: {
        mortaises: data.mortaises, plaques: data.plaques, rolling: data.rolling,
        eponges: data.eponges, extensions: data.extensions, egg_bar: data.egg_bar,
        autre: data.autre,
      },
      nom_marechal: data.nom_marechal || null,
      tel_marechal: data.tel_marechal || null,
      cout_habituel: data.cout ? parseFloat(data.cout) : null,
      recurrence_semaines: data.recurrence_semaines,
      updated_at: new Date().toISOString(),
    }, { onConflict: "horse_id" });
  };

  const profileChanged = (): boolean => {
    if (!profile) return false;
    const coutVal = cout ? parseFloat(cout) : null;
    return (
      typeIntervention !== profile.type_intervention ||
      repartitionFers !== profile.repartition_fers ||
      matiereFer !== profile.matiere_fer ||
      nomMarechal !== (profile.nom_marechal || "") ||
      telMarechal !== (profile.tel_marechal || "") ||
      coutVal !== profile.cout_habituel ||
      recurrenceSemaines !== profile.recurrence_semaines
    );
  };

  // ── Quick confirm save ─────────────────────────────────────────────────────
  const handleQuickSave = async () => {
    setLoading(true);
    const payload = buildPayload(true);
    const { error } = await supabase.from("health_records").insert(payload as Partial<HealthRecord>);
    if (error) {
      console.error("[MarechalLog] INSERT failed:", error);
      toast.error(`Erreur : ${error.message || "champ manquant"}`);
      setLoading(false);
      return;
    }
    if (addToBudget && payload.cost && payload.cost > 0) {
      const desc = ["Parage / Maréchal", payload.vet_name].filter(Boolean).join(" — ");
      await supabase.from("budget_entries").insert({
        horse_id: horseId, date: payload.date, category: "maréchalerie",
        amount: payload.cost, description: desc || null,
      });
    }
    toast.success("Passage enregistré !");
    onSaved(); router.refresh();
    handleClose();
    setLoading(false);
  };

  // ── Full form save ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!typeIntervention) { toast.error("Sélectionnez un type d'intervention"); return; }
    setLoading(true);
    const payload = buildPayload(false);

    let err;
    if (defaultValues?.id) {
      const res = await supabase.from("health_records").update(payload as Partial<HealthRecord>).eq("id", defaultValues.id);
      err = res.error;
    } else {
      const res = await supabase.from("health_records").insert(payload as Partial<HealthRecord>);
      err = res.error;
    }

    if (err) {
      console.error("[MarechalLog] INSERT/UPDATE failed:", err);
      toast.error(`Erreur : ${err.message || "champ manquant"}`);
      setLoading(false);
      return;
    }
    if (!defaultValues?.id && addToBudget && payload.cost && payload.cost > 0) {
      const desc = ["Parage / Maréchal", payload.vet_name].filter(Boolean).join(" — ");
      await supabase.from("budget_entries").insert({
        horse_id: horseId, date: payload.date, category: "maréchalerie",
        amount: payload.cost, description: desc || null,
      });
    }
    toast.success(defaultValues?.id ? "Soin mis à jour" : "Passage enregistré !");
    onSaved(); router.refresh();
    setLoading(false);

    if (!defaultValues?.id && NEEDS_PROFILE(typeIntervention)) {
      if (!profile) { setView("save_prompt"); return; }
      if (profileChanged()) { setView("update_prompt"); return; }
    }
    handleClose();
  };

  if (!open) return null;

  // ── Overlay ────────────────────────────────────────────────────────────────
  const Overlay = ({ children }: { children: React.ReactNode }) => (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[92dvh] flex flex-col shadow-xl">
        {children}
      </div>
    </div>
  );

  // ── Save profile prompt ────────────────────────────────────────────────────
  if (view === "save_prompt") {
    return (
      <Overlay>
        <div className="p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-light flex items-center justify-center text-2xl mx-auto">🔨</div>
          <div>
            <p className="font-bold text-black">Sauvegarder comme configuration habituelle ?</p>
            <p className="text-sm text-gray-500 mt-1">
              Ces valeurs seront préremplies automatiquement pour les prochains passages de <strong>{horseName}</strong>.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleClose} className="flex-1 btn-secondary py-2.5 text-sm">Non merci</button>
            <button
              onClick={async () => {
                await saveProfileData({ ...options, type_intervention: typeIntervention, repartition_fers: repartitionFers, matiere_fer: matiereFer, nom_marechal: nomMarechal, tel_marechal: telMarechal, cout, recurrence_semaines: recurrenceSemaines });
                toast.success("Configuration sauvegardée");
                router.refresh();
                handleClose();
              }}
              className="flex-1 btn-primary py-2.5 text-sm"
            >
              Oui, sauvegarder
            </button>
          </div>
        </div>
      </Overlay>
    );
  }

  // ── Update profile prompt ──────────────────────────────────────────────────
  if (view === "update_prompt") {
    return (
      <Overlay>
        <div className="p-6 space-y-4">
          <p className="font-bold text-black">Mettre à jour la configuration habituelle ?</p>
          <p className="text-sm text-gray-500">Les nouvelles valeurs remplaceront votre profil enregistré pour {horseName}.</p>
          <div className="flex gap-3">
            <button onClick={handleClose} className="flex-1 btn-secondary py-2.5 text-sm">Non, garder l&apos;ancien</button>
            <button
              onClick={async () => {
                await saveProfileData({ ...options, type_intervention: typeIntervention, repartition_fers: repartitionFers, matiere_fer: matiereFer, nom_marechal: nomMarechal, tel_marechal: telMarechal, cout, recurrence_semaines: recurrenceSemaines });
                toast.success("Configuration mise à jour");
                router.refresh();
                handleClose();
              }}
              className="flex-1 btn-primary py-2.5 text-sm"
            >
              Oui, mettre à jour
            </button>
          </div>
        </div>
      </Overlay>
    );
  }

  // ── Quick confirm ──────────────────────────────────────────────────────────
  if (view === "quick_confirm" && profile) {
    return (
      <Overlay>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-bold text-black text-base">Même chose que d&apos;habitude ?</p>
            <button onClick={handleClose} className="text-gray-400 hover:text-black"><X className="h-4 w-4" /></button>
          </div>
          <p className="text-sm text-gray-500 italic leading-relaxed">{buildMarechalSummary(profile)}</p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600"
            />
            <span>Date du passage</span>
          </div>
          {profile.cout_habituel && profile.cout_habituel > 0 && (
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={addToBudget}
                onChange={(e) => setAddToBudget(e.target.checked)}
                className="w-4 h-4 rounded accent-orange"
              />
              <span className="text-sm text-gray-700">
                Ajouter <strong>{profile.cout_habituel} €</strong> au budget (Maréchalerie)
              </span>
            </label>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => { prefillFromProfile(profile); setView("full_form"); }}
              className="flex-1 btn-secondary py-3 text-sm flex items-center justify-center gap-1.5"
            >
              ✏️ Modifier
            </button>
            <button
              onClick={handleQuickSave}
              disabled={loading}
              className="flex-1 btn-primary py-3 text-sm disabled:opacity-50"
            >
              {loading ? "Enregistrement..." : "✓ Oui, enregistrer"}
            </button>
          </div>
        </div>
      </Overlay>
    );
  }

  // ── Full form ──────────────────────────────────────────────────────────────
  const showFerOptions = typeIntervention === "ferrure" || typeIntervention === "ferrure_ortho";
  const showRecurrence = typeIntervention !== "urgence";
  const recurrenceValue = recurrenceSemaines;

  return (
    <Overlay>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
        <p className="font-bold text-black">
          {defaultValues?.id ? "Modifier le passage" : "Enregistrer un passage maréchal"}
        </p>
        <button onClick={handleClose} className="text-gray-400 hover:text-black"><X className="h-4 w-4" /></button>
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

        {/* Date */}
        <div>
          <label className="label">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange"
          />
        </div>

        {/* BLOC A — Type d'intervention */}
        <div>
          <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">Type d&apos;intervention</p>
          <div className="grid grid-cols-3 gap-2">
            {(["parage", "ferrure", "ferrure_ortho", "urgence", "deferrage", "autre"] as InterventionType[]).map((t) => (
              <Tile
                key={t}
                label={INTERVENTION_LABELS[t]}
                active={typeIntervention === t}
                onClick={() => setTypeIntervention(t)}
              />
            ))}
          </div>
          {typeIntervention === "urgence" && (
            <div className="mt-2 flex flex-wrap gap-2">
              {["Repose fer perdu", "Fer cassé / décollé", "Autre urgence"].map((opt) => (
                <Pill
                  key={opt}
                  label={opt}
                  active={sousTypeUrgence === opt}
                  onClick={() => setSousTypeUrgence(sousTypeUrgence === opt ? null : opt)}
                />
              ))}
            </div>
          )}
        </div>

        {/* BLOC B — Répartition */}
        {showFerOptions && (
          <div>
            <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">Répartition</p>
            <div className="flex gap-2">
              {(["anterieurs", "posterieurs", "4_fers"] as RepartitionFers[]).map((r) => (
                <Pill
                  key={r}
                  label={r === "anterieurs" ? "Antérieurs" : r === "posterieurs" ? "Postérieurs" : "4 fers"}
                  active={repartitionFers === r}
                  onClick={() => setRepartitionFers(repartitionFers === r ? null : r)}
                />
              ))}
            </div>
          </div>
        )}

        {/* BLOC C — Matière */}
        {showFerOptions && (
          <div>
            <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">Matière du fer</p>
            <div className="flex flex-wrap gap-2">
              {(["acier", "aluminium", "duplo", "colle", "autre"] as MatiereFer[]).map((m) => (
                <Pill
                  key={m}
                  label={m === "acier" ? "Acier" : m === "aluminium" ? "Aluminium" : m === "duplo" ? "Duplo" : m === "colle" ? "Fer collé" : "Autre"}
                  active={matiereFer === m}
                  onClick={() => setMatiereFer(matiereFer === m ? null : m)}
                />
              ))}
            </div>
          </div>
        )}

        {/* BLOC D — Récurrence */}
        {showRecurrence && (
          <div>
            <p className="text-2xs font-bold uppercase tracking-widest text-gray-400 mb-2">Récurrence</p>
            <div className="flex flex-wrap gap-2">
              {RECURRENCE_OPTIONS.map((opt) => (
                <Pill
                  key={opt.value}
                  label={opt.label}
                  active={opt.value === -1 ? (recurrenceValue !== null && ![4, 5, 6, 7, 0].includes(recurrenceValue)) : recurrenceValue === opt.value}
                  onClick={() => {
                    if (opt.value === -1) {
                      setRecurrenceSemaines(recurrenceCustom ? parseInt(recurrenceCustom) : null);
                    } else {
                      setRecurrenceSemaines(opt.value);
                      setRecurrenceCustom("");
                    }
                  }}
                />
              ))}
            </div>
            {recurrenceValue !== null && ![4, 5, 6, 7, 0].includes(recurrenceValue) && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={recurrenceCustom}
                  onChange={(e) => {
                    setRecurrenceCustom(e.target.value);
                    setRecurrenceSemaines(parseInt(e.target.value) || null);
                  }}
                  placeholder="Nb semaines"
                  className="w-28 border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange"
                />
                <span className="text-xs text-gray-400">semaines</span>
              </div>
            )}
          </div>
        )}

        {/* BLOC E — Options avancées */}
        <div>
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-black transition-colors"
          >
            {showOptions ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showOptions ? "Masquer les détails" : "+ Détails (options avancées)"}
          </button>
          {showOptions && (
            <div className="mt-3 space-y-2 pl-1">
              {([
                { key: "mortaises", label: "Mortaises" },
                { key: "plaques", label: "Plaques (sole)" },
                { key: "rolling", label: "Rolling / roulement" },
                { key: "eponges", label: "Éponges élargies / oignons" },
                { key: "extensions", label: "Extensions / talonnettes" },
                { key: "egg_bar", label: "Egg-bar" },
              ] as { key: keyof Omit<Options, "autre">; label: string }[]).map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options[key]}
                    onChange={(e) => setOptions({ ...options, [key]: e.target.checked })}
                    className="w-4 h-4 rounded accent-orange"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
              <div className="pt-1">
                <input
                  type="text"
                  value={options.autre}
                  onChange={(e) => setOptions({ ...options, autre: e.target.value })}
                  placeholder="Autre option..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange"
                />
              </div>
            </div>
          )}
        </div>

        {/* BLOC F — Champs standards */}
        <div className="space-y-3">
          <p className="text-2xs font-bold uppercase tracking-widest text-gray-400">Praticien & coût</p>
          <input
            type="text"
            value={nomMarechal}
            onChange={(e) => setNomMarechal(e.target.value)}
            placeholder="Nom du maréchal"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange"
          />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="tel"
                value={telMarechal}
                onChange={(e) => setTelMarechal(e.target.value)}
                placeholder="Téléphone"
                className="w-full pl-8 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange"
              />
            </div>
            <div className="relative w-28">
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
              <input
                type="number"
                value={cout}
                onChange={(e) => setCout(e.target.value)}
                placeholder="Coût"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange"
              />
            </div>
          </div>
          <p className="text-2xs text-gray-400">📵 Le numéro est mémorisé uniquement pour vous, jamais partagé.</p>
          {!defaultValues?.id && cout && parseFloat(cout) > 0 && (
            <label className="flex items-center gap-2.5 cursor-pointer select-none mt-1">
              <input
                type="checkbox"
                checked={addToBudget}
                onChange={(e) => setAddToBudget(e.target.checked)}
                className="w-4 h-4 rounded accent-orange"
              />
              <span className="text-sm text-gray-700">
                Ajouter <strong>{cout} €</strong> au budget (Maréchalerie)
              </span>
            </label>
          )}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes libres..."
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-orange"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-5 pt-3 border-t border-gray-100 flex gap-3 flex-shrink-0">
        <button onClick={handleClose} className="flex-1 btn-secondary py-3 text-sm">Annuler</button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex-1 btn-primary py-3 text-sm disabled:opacity-50"
        >
          {loading ? "Enregistrement..." : defaultValues?.id ? "Mettre à jour" : "Enregistrer"}
        </button>
      </div>
    </Overlay>
  );
}
