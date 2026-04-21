"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { format, isAfter, startOfDay, parseISO } from "date-fns";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { ChevronDown } from "lucide-react";
import { DISCIPLINE_LABELS } from "@/lib/utils";
import type { Competition, StatutParticipation, MotifElimination } from "@/lib/supabase/types";
import { trackEvent } from "@/lib/trackEvent";

const COMPETITION_DISCIPLINES = ["CSO", "Dressage", "CCE", "Autre"];
const disciplineOptions = COMPETITION_DISCIPLINES.map((v) => ({ value: v, label: DISCIPLINE_LABELS[v] ?? v }));

type LevelGroup = { group: string; levels: string[] };

const LEVELS_BY_DISCIPLINE: Record<string, LevelGroup[]> = {
  CCE: [
    { group: "Jeunes Chevaux / SHF", levels: ["Jeunes Chevaux / SHF", "Cycle Libre 1", "Cycle Libre 2", "Cycle Libre 3", "Formation 1", "Formation 2", "Formation 3", "Cycle Classique 4 ans", "Cycle Classique 5 ans", "Cycle Classique 6 ans", "Cycle Jeunes Poneys 4 ans", "Cycle Jeunes Poneys 5 ans", "Cycle Jeunes Poneys 6 ans"] },
    { group: "Amateur", levels: ["Amateur", "Amateur 4", "Amateur 3", "Amateur 2", "Amateur 1", "Amateur Elite"] },
    { group: "Club", levels: ["Club", "Club 3", "Club 2", "Club 1", "Club Elite", "Club E 2", "Club E 1", "Club E Elite"] },
    { group: "Pro", levels: ["Pro", "Pro 4", "Pro 3", "Pro 2", "Pro 1", "Pro Elite"] },
    { group: "Poney", levels: ["Poney", "Poney 3", "Poney 2", "Poney 1", "Poney Elite"] },
    { group: "As Poney", levels: ["As Poney", "As Poney 2", "As Poney 1", "As Poney Elite"] },
    { group: "As Jeunes", levels: ["As Jeunes", "As Jeunes 2", "As Jeunes 1", "As Jeune Elite"] },
    { group: "International FEI / CCI", levels: ["CCI1*-Intro", "CCI2*-S", "CCI2*-L", "CCI3*-S", "CCI3*-L", "CCI4*-S", "CCI4*-L", "CCI5*-L"] },
  ],
  CSO: [
    { group: "Jeunes Chevaux SHF", levels: ["Jeunes chevaux SHF", "Cycle Classique 4 ans", "Cycle Classique 5 ans", "Cycle Classique 6 ans", "Cycle Libre 1", "Cycle Libre 2", "Cycle Libre 3", "Formation 1", "Formation 2", "Formation 3", "Formation 4", "Cycle Jeunes Poneys 4 ans", "Cycle Jeunes Poneys 5 ans", "Cycle Jeunes Poneys 6 ans"] },
    { group: "Club", levels: ["Club 4", "Club 3", "Club 2", "Club 1", "Club Elite"] },
    { group: "Club E", levels: ["Club E3", "Club E2", "Club E1", "Club E Elite"] },
    { group: "Poney", levels: ["Poney A 2", "Poney A 1", "Poney A Elite", "Poney 4", "Poney 3", "Poney 2", "Poney 1", "Poney Elite", "Future Elite 7 ans"] },
    { group: "As Poney", levels: ["As Poney 2C", "As Poney 2D", "As Poney 1", "As Poney Elite"] },
    { group: "Amateur", levels: ["Amateur 3", "Amateur 2", "Amateur 1", "Amateur Elite"] },
    { group: "Pro", levels: ["Pro 3", "Pro 2", "Pro 1", "Pro Elite"] },
    { group: "CSI International", levels: ["CSI1*", "CSI2*", "CSI3*", "CSI4*", "CSI5*", "CSIYH1*", "CSIYH2*", "CSIP", "CSIY", "CSIU25", "CSI-Am"] },
    { group: "Préparatoire", levels: ["Préparatoire 30 cm", "Préparatoire 35 cm", "Préparatoire 40 cm", "Préparatoire 45 cm", "Préparatoire 50 cm", "Préparatoire 55 cm", "Préparatoire 60 cm", "Préparatoire 65 cm", "Préparatoire 70 cm", "Préparatoire 75 cm", "Préparatoire 80 cm", "Préparatoire 85 cm", "Préparatoire 90 cm", "Préparatoire 95 cm", "Préparatoire 1,00 m", "Préparatoire 1,05 m", "Préparatoire 1,10 m", "Préparatoire 1,15 m", "Préparatoire 1,20 m", "Préparatoire 1,25 m", "Préparatoire 1,30 m", "Préparatoire 1,35 m", "Préparatoire 1,40 m", "Préparatoire 1,45 m", "Préparatoire 1,50 m"] },
  ],
  Dressage: [
    { group: "Jeunes Chevaux SHF / Cycle Classique", levels: ["Chevaux de 4 ans, reprise préliminaire", "Chevaux de 4 ans, reprise finale", "Chevaux de 5 ans, reprise préliminaire", "Chevaux de 5 ans, reprise finale", "Chevaux de 6 ans, reprise préliminaire", "Chevaux de 6 ans, reprise finale"] },
    { group: "Formation", levels: ["Formation 1, reprise préliminaire", "Formation 1, reprise finale", "Formation 2, reprise préliminaire", "Formation 2, reprise finale", "Formation 3, reprise préliminaire", "Formation 3, reprise finale"] },
    { group: "Cycle Libre", levels: ["Cycle Libre 1, reprise préliminaire", "Cycle Libre 1, reprise finale", "Cycle Libre 2, reprise préliminaire", "Cycle Libre 2, reprise finale", "Cycle Libre 3, reprise préliminaire", "Cycle Libre 3, reprise finale"] },
    { group: "Jeunes Poneys SHF", levels: ["Cycle Jeunes Poneys 4 ans", "Cycle Jeunes Poneys 5 ans", "Cycle Jeunes Poneys 6 ans"] },
    { group: "Club", levels: ["Club 4 Grand Prix", "Club 4 Libre", "Club 3 Grand Prix", "Club 3 Libre", "Club 2 Grand Prix", "Club 2 Libre", "Club 1 Grand Prix", "Club 1 Libre", "Club Elite Grand Prix", "Club Elite Libre"] },
    { group: "Club E", levels: ["Club E3 Grand Prix", "Club E3 Libre", "Club E2 Grand Prix", "Club E2 Libre", "Club E1 Grand Prix", "Club E1 Libre", "Club E Elite Grand Prix", "Club E Elite Libre"] },
    { group: "Poney", levels: ["Poney 4 Grand Prix", "Poney 4 Libre", "Poney 3 Grand Prix", "Poney 3 Libre", "Poney 2 Grand Prix", "Poney 2 Libre", "Poney 1 Grand Prix", "Poney 1 Libre", "Poney Elite Grand Prix", "Poney Elite Libre"] },
    { group: "As Poney", levels: ["As Poney 2 Grand Prix", "As Poney 2 Libre", "As Poney 1 Grand Prix", "As Poney 1 Libre", "As Poney Elite Équipe", "As Poney Elite Grand Prix", "As Poney Elite Libre"] },
    { group: "Amateur 3", levels: ["Amateur 3 Préliminaire D2", "Amateur 3 Grand Prix D1", "Amateur 3 Préliminaire Préparatoire", "Amateur 3 Grand Prix Préparatoire", "Amateur 3 Libre"] },
    { group: "Amateur 2", levels: ["Amateur 2 B C4", "Amateur 2 A C3", "Amateur 2 Préliminaire C2", "Amateur 2 Grand Prix C1", "Amateur 2 B Préparatoire", "Amateur 2 A Préparatoire", "Amateur 2 Préliminaire Préparatoire", "Amateur 2 Grand Prix Préparatoire", "Amateur 2 Libre"] },
    { group: "Amateur 1", levels: ["Amateur 1 B B4", "Amateur 1 A B3", "Amateur 1 Préliminaire B2", "Amateur 1 Grand Prix B1", "Amateur 1 B Préparatoire", "Amateur 1 A Préparatoire", "Amateur 1 Préliminaire Préparatoire", "Amateur 1 Grand Prix Préparatoire", "Amateur 1 Libre"] },
    { group: "Amateur Elite", levels: ["Amateur Elite Préliminaire A7", "Amateur Elite Grand Prix A6", "Amateur Elite Préliminaire Préparatoire", "Amateur Elite Grand Prix Préparatoire", "Amateur Elite Libre"] },
    { group: "Pro 3", levels: ["Pro 3 B A10", "Pro 3 A A9", "Pro 3 Préliminaire A8A", "Pro 3 Grand Prix A8B", "Pro 3 B Préparatoire", "Pro 3 A Préparatoire", "Pro 3 Préliminaire Préparatoire", "Pro 3 Grand Prix Préparatoire", "Pro 3 Libre"] },
    { group: "Pro 2", levels: ["Pro 2 A A7", "Pro 2 Grand Prix A5", "Pro 2 A Préparatoire", "Pro 2 Grand Prix Préparatoire", "Pro 2 Préliminaire", "Pro 2 Préliminaire Préparatoire", "Pro 2 Libre"] },
    { group: "Pro 1", levels: ["Pro 1 Préliminaire A4", "Pro 1 Grand Prix A3", "Pro 1 A", "Pro 1 A Préparatoire", "Pro 1 Préliminaire Préparatoire", "Pro 1 Grand Prix Préparatoire", "Pro 1 Libre"] },
    { group: "Pro Elite", levels: ["Pro Elite Grand Prix Jeune", "Pro Elite Grand Prix", "Pro Elite Grand Prix Spécial", "Pro Elite Libre"] },
    { group: "As Jeunes 3", levels: ["As Jeunes 3 Préliminaire", "As Jeunes 3 Équipe", "As Jeunes 3 Grand Prix"] },
    { group: "As Jeunes 2", levels: ["As Jeunes 2 Préliminaire", "As Jeunes 2 Grand Prix"] },
    { group: "As Jeune 1", levels: ["As Jeune 1 Équipe", "As Jeune 1 Grand Prix"] },
    { group: "As Jeune Elite", levels: ["As Jeune Elite Équipe", "As Jeune Elite Grand Prix", "As Jeune Elite Libre"] },
    { group: "Avenir", levels: ["Avenir 1", "Avenir 2", "Avenir 3", "Avenir Elite"] },
    { group: "Niveaux FEI", levels: ["CDI1*", "CDI2*", "CDI3*", "CDI4*", "CDI5*", "CDIO", "CDI W", "CDIP", "CDICh", "CDIJ", "CDIY", "CDIU25", "CDIAm", "CDIYH"] },
  ],
};

const GENERIC_LEVELS: LevelGroup[] = [
  { group: "Niveaux", levels: ["Débutant", "Club", "Amateur", "Pro", "Elite", "Autre"] },
];

interface Props {
  horseId: string;
  onSaved: () => void;
  onCancel: () => void;
  defaultValues?: Partial<Competition>;
}

export default function CompetitionForm({ horseId, onSaved, onCancel, defaultValues }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  // Auto-detect initial status
  const getInitialStatus = (): "a_venir" | "passe" => {
    if (defaultValues?.status) {
      // If editing a_venir with passed date → switch to passe to unlock result fields
      if (defaultValues.status === "a_venir" && defaultValues.date) {
        const isPast = !isAfter(startOfDay(parseISO(defaultValues.date)), startOfDay(new Date()));
        if (isPast) return "passe";
      }
      return defaultValues.status;
    }
    const dateToCheck = defaultValues?.date || format(new Date(), "yyyy-MM-dd");
    const isFuture = isAfter(startOfDay(parseISO(dateToCheck)), startOfDay(new Date()));
    return isFuture ? "a_venir" : "passe";
  };

  const [status, setStatus] = useState<"a_venir" | "passe">(getInitialStatus);
  const [statutParticipation, setStatutParticipation] = useState<StatutParticipation>(defaultValues?.statut_participation || "classe");
  const [motifElimination, setMotifElimination] = useState<MotifElimination | null>(defaultValues?.motif_elimination || null);
  const [form, setForm] = useState({
    date: defaultValues?.date || format(new Date(), "yyyy-MM-dd"),
    event_name: defaultValues?.event_name || "",
    discipline: defaultValues?.discipline || "CSO",
    level: defaultValues?.level || "",
    result_rank: defaultValues?.result_rank ? String(defaultValues.result_rank) : "",
    total_riders: defaultValues?.total_riders ? String(defaultValues.total_riders) : "",
    score: defaultValues?.score ? String(defaultValues.score) : "",
    location: defaultValues?.location || "",
    notes: defaultValues?.notes || "",
    score_dressage: defaultValues?.score_dressage ? String(defaultValues.score_dressage) : "",
    penalites_cso: defaultValues?.penalites_cso ? String(defaultValues.penalites_cso) : "",
    penalites_cross: defaultValues?.penalites_cross ? String(defaultValues.penalites_cross) : "",
    // TRAV-28-04 — CSO détail
    cso_barres: defaultValues?.cso_barres ? String(defaultValues.cso_barres) : "0",
    cso_refus: defaultValues?.cso_refus ? String(defaultValues.cso_refus) : "0",
    // TRAV-28-05 — CCE CSO détail
    cce_cso_barres: defaultValues?.cce_cso_barres ? String(defaultValues.cce_cso_barres) : "0",
    cce_cso_refus: defaultValues?.cce_cso_refus ? String(defaultValues.cce_cso_refus) : "0",
    // TRAV-28-06 — Dressage détail
    dressage_reprise: defaultValues?.dressage_reprise || "",
    dressage_note_pct: defaultValues?.dressage_note_pct ? String(defaultValues.dressage_note_pct) : "",
    // TRAV-28-15 — Budget concours
    budget_engagement: "",
    budget_transport: "",
    budget_box: "",
    budget_coaching: "",
    budget_divers: "",
    budget_divers_detail: "",
  });
  const showResultFields = statutParticipation === "classe";
  const showPartants = statutParticipation !== "hors_concours";

  // TRAV-28-15 — Budget total auto-calculé
  const budgetTotal = [form.budget_engagement, form.budget_transport, form.budget_box, form.budget_coaching, form.budget_divers]
    .reduce((sum, v) => sum + (parseFloat(v) || 0), 0);

  // Auto-update status when date changes
  const handleDateChange = (newDate: string) => {
    const isFuture = isAfter(startOfDay(parseISO(newDate)), startOfDay(new Date()));
    setStatus(isFuture ? "a_venir" : "passe");
    setForm({ ...form, date: newDate });
  };

  const levelGroups = LEVELS_BY_DISCIPLINE[form.discipline] ?? GENERIC_LEVELS;

  const handleDisciplineChange = (discipline: string) => {
    setForm({
      ...form,
      discipline: discipline as Competition["discipline"],
      level: "",
      // Reset discipline-specific fields to avoid stale data leakage
      cso_barres: "0", cso_refus: "0",
      cce_cso_barres: "0", cce_cso_refus: "0",
      score_dressage: "", penalites_cso: "", penalites_cross: "",
      dressage_reprise: "", dressage_note_pct: "",
      score: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.event_name.trim()) { toast.error("Le nom du concours est requis"); return; }
    // TRAV-28-01 — Niveau obligatoire uniquement si statut "Passé"
    if (status === "passe" && !form.level) { toast.error("Veuillez sélectionner un niveau pour enregistrer ce concours."); return; }
    setLoading(true);

    const isPasse = status === "passe";
    const isClasse = statutParticipation === "classe";

    const payload = {
      horse_id: horseId,
      date: form.date,
      event_name: form.event_name.trim(),
      discipline: form.discipline as Competition["discipline"],
      level: form.level || "",
      status,
      statut_participation: isPasse ? statutParticipation : "classe",
      motif_elimination: isPasse && statutParticipation === "elimine" ? motifElimination : null,
      result_rank: isPasse && isClasse && form.result_rank ? parseInt(form.result_rank) : null,
      total_riders: isPasse && statutParticipation !== "hors_concours" && form.total_riders ? parseInt(form.total_riders) : null,
      score: isPasse && isClasse && form.score ? parseFloat(form.score) : null,
      location: form.location || null,
      notes: form.notes || null,
      score_dressage: isPasse && isClasse && form.discipline === "CCE" && form.score_dressage ? parseFloat(form.score_dressage) : null,
      penalites_cso: isPasse && isClasse && form.discipline === "CCE" && form.penalites_cso !== "" ? parseFloat(form.penalites_cso) : null,
      penalites_cross: isPasse && isClasse && form.discipline === "CCE" && form.penalites_cross !== "" ? parseFloat(form.penalites_cross) : null,
      // TRAV-28-04 — CSO détail (score = (barres + refus) × 4)
      cso_barres: isPasse && isClasse && form.discipline === "CSO" ? parseInt(form.cso_barres) || 0 : 0,
      cso_refus: isPasse && isClasse && form.discipline === "CSO" ? parseInt(form.cso_refus) || 0 : 0,
      // TRAV-28-05 — CCE CSO détail
      cce_cso_barres: isPasse && isClasse && form.discipline === "CCE" ? parseInt(form.cce_cso_barres) || 0 : 0,
      cce_cso_refus: isPasse && isClasse && form.discipline === "CCE" ? parseInt(form.cce_cso_refus) || 0 : 0,
      // TRAV-28-06 — Dressage détail
      dressage_reprise: isPasse && isClasse && form.discipline === "Dressage" ? form.dressage_reprise || null : null,
      dressage_note_pct: isPasse && isClasse && form.discipline === "Dressage" && form.dressage_note_pct ? parseFloat(form.dressage_note_pct) : null,
    };

    // TRAV-28-04 — Recalculer score pour CSO pur
    if (isPasse && isClasse && form.discipline === "CSO") {
      (payload as Record<string, unknown>).score = ((parseInt(form.cso_barres) || 0) + (parseInt(form.cso_refus) || 0)) * 4;
    }
    // TRAV-28-05 — Recalculer penalites_cso pour CCE
    if (isPasse && isClasse && form.discipline === "CCE") {
      (payload as Record<string, unknown>).penalites_cso = ((parseInt(form.cce_cso_barres) || 0) + (parseInt(form.cce_cso_refus) || 0)) * 4;
    }

    let competitionId = defaultValues?.id || null;

    if (defaultValues?.id) {
      const { error: updateErr } = await supabase.from("competitions").update(payload).eq("id", defaultValues.id);
      if (updateErr) { toast.error("Erreur lors de l'enregistrement"); setLoading(false); return; }
    } else {
      const { data: inserted, error: insertErr } = await supabase.from("competitions").insert(payload).select("id").single();
      if (insertErr || !inserted) { toast.error("Erreur lors de l'enregistrement"); setLoading(false); return; }
      competitionId = inserted.id;
      trackEvent({ event_name: "competition_created", event_category: "competition", properties: { discipline: form.discipline, level: form.level, status } });
    }

    // TRAV-28-15 — Liaison budget : créer/mettre à jour la dépense liée
    if (competitionId && budgetTotal > 0) {
      const budgetPayload = {
        horse_id: horseId,
        date: form.date,
        category: "concours" as const,
        amount: budgetTotal,
        description: `${form.event_name}${form.level ? ` — ${form.discipline} ${form.level}` : ""}`,
        linked_competition_id: competitionId,
      };
      // Chercher une dépense existante liée à ce concours
      const { data: existing } = await supabase
        .from("budget_entries")
        .select("id")
        .eq("linked_competition_id", competitionId)
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase.from("budget_entries").update(budgetPayload).eq("id", existing[0].id);
      } else {
        await supabase.from("budget_entries").insert(budgetPayload);
      }
    } else if (competitionId && budgetTotal === 0) {
      // Si budget vidé → supprimer la dépense liée
      await supabase.from("budget_entries").delete().eq("linked_competition_id", competitionId);
    }

    toast.success("Concours enregistré !");
    onSaved();
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Statut */}
      <div>
        <p className="label mb-2">Statut</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStatus("a_venir")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
              status === "a_venir" ? "border-orange bg-orange-light text-orange" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            <span>📅</span> À venir
          </button>
          <button
            type="button"
            onClick={() => setStatus("passe")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
              status === "passe" ? "border-black bg-black text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            <span>✅</span> Passé
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Date"
          type="date"
          value={form.date}
          onChange={(e) => handleDateChange(e.target.value)}
          required
        />
        <Input
          label="Nom du concours"
          value={form.event_name}
          onChange={(e) => setForm({ ...form, event_name: e.target.value })}
          placeholder="Grand Prix de Paris"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Discipline"
          value={form.discipline}
          onChange={(e) => handleDisciplineChange(e.target.value)}
          options={disciplineOptions}
        />
        <div className="w-full">
          <label className="label">Niveau</label>
          <div className="relative">
            <select
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
              className={`input appearance-none pr-9 w-full ${status === "passe" && !form.level ? "border-red-400" : ""}`}
              required={status === "passe"}
            >
              <option value="" disabled>Sélectionner</option>
              {levelGroups.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.levels.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <Input
        label="Lieu"
        value={form.location}
        onChange={(e) => setForm({ ...form, location: e.target.value })}
        placeholder="Paris, Fontainebleau..."
      />

      <Textarea
        label="Notes"
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
        placeholder="Observations, conditions, parcours..."
        rows={2}
      />

      {/* Résultats — Passé seulement */}
      {status === "passe" && (
        <div className="space-y-4 pt-1 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Résultats</p>

          {/* TRAV-28-03 — Statut de participation */}
          <div>
            <p className="label mb-2">Participation</p>
            <div className="grid grid-cols-4 gap-1.5">
              {([
                { value: "classe", label: "Classé" },
                { value: "abandonne", label: "Abandonné" },
                { value: "elimine", label: "Éliminé" },
                { value: "hors_concours", label: "HC" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setStatutParticipation(opt.value); if (opt.value !== "elimine") setMotifElimination(null); }}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all border-2 ${
                    statutParticipation === opt.value
                      ? opt.value === "elimine" ? "border-red-400 bg-red-50 text-red-700"
                        : opt.value === "abandonne" ? "border-gray-400 bg-gray-100 text-gray-700"
                        : opt.value === "hors_concours" ? "border-gray-300 bg-gray-50 text-gray-600"
                        : "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Motif élimination */}
          {statutParticipation === "elimine" && (
            <div>
              <p className="label mb-2">Motif</p>
              <div className="grid grid-cols-4 gap-1.5">
                {([
                  { value: "refus_repetes", label: "Refus" },
                  { value: "chute", label: "Chute" },
                  { value: "hors_temps", label: "Hors temps" },
                  { value: "autre", label: "Autre" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMotifElimination(opt.value)}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all border-2 ${
                      motifElimination === opt.value
                        ? "border-red-400 bg-red-50 text-red-700"
                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showResultFields && (<>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Classement"
                type="number"
                value={form.result_rank}
                onChange={(e) => setForm({ ...form, result_rank: e.target.value })}
                placeholder="1"
                min="1"
              />
              <Input
                label="Nb. partants"
                type="number"
                value={form.total_riders}
                onChange={(e) => setForm({ ...form, total_riders: e.target.value })}
                placeholder="20"
                min="1"
              />
            </div>

            {/* TRAV-28-04 — CSO : barres + refus séparés */}
            {form.discipline === "CSO" && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500">Détail CSO</p>
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label="Barres abattues"
                    type="number"
                    value={form.cso_barres}
                    onChange={(e) => setForm({ ...form, cso_barres: e.target.value })}
                    placeholder="0"
                    min="0"
                  />
                  <Input
                    label="Refus"
                    type="number"
                    value={form.cso_refus}
                    onChange={(e) => setForm({ ...form, cso_refus: e.target.value })}
                    placeholder="0"
                    min="0"
                  />
                  <div>
                    <label className="label">Total pén.</label>
                    <div className="input bg-gray-50 text-gray-600 font-semibold">
                      {((parseInt(form.cso_barres) || 0) + (parseInt(form.cso_refus) || 0)) * 4}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TRAV-28-05 — CCE : barres + refus CSO séparés */}
            {form.discipline === "CCE" && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500">Détail CCE</p>
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label="Score dressage (%)"
                    type="number"
                    value={form.score_dressage}
                    onChange={(e) => setForm({ ...form, score_dressage: e.target.value })}
                    placeholder="68.5"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                  <div className="col-span-2 grid grid-cols-3 gap-2">
                    <Input
                      label="Barres CSO"
                      type="number"
                      value={form.cce_cso_barres}
                      onChange={(e) => setForm({ ...form, cce_cso_barres: e.target.value })}
                      placeholder="0"
                      min="0"
                    />
                    <Input
                      label="Refus CSO"
                      type="number"
                      value={form.cce_cso_refus}
                      onChange={(e) => setForm({ ...form, cce_cso_refus: e.target.value })}
                      placeholder="0"
                      min="0"
                    />
                    <div>
                      <label className="label">Pén. CSO</label>
                      <div className="input bg-gray-50 text-gray-600 font-semibold text-sm">
                        {((parseInt(form.cce_cso_barres) || 0) + (parseInt(form.cce_cso_refus) || 0)) * 4}
                      </div>
                    </div>
                  </div>
                </div>
                <Input
                  label="Pénalités cross (total)"
                  type="number"
                  value={form.penalites_cross}
                  onChange={(e) => setForm({ ...form, penalites_cross: e.target.value })}
                  placeholder="0"
                  min="0"
                  step="0.5"
                />
              </div>
            )}

            {/* TRAV-28-06 — Dressage : reprise + note % */}
            {form.discipline === "Dressage" && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500">Détail Dressage</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Reprise</label>
                    <select
                      value={form.dressage_reprise}
                      onChange={(e) => setForm({ ...form, dressage_reprise: e.target.value })}
                      className="input appearance-none w-full"
                    >
                      <option value="">Sélectionner</option>
                      {["Intro A", "Intro B", "Club 1", "Club 2", "Club 3", "Amateur 1", "Amateur 2", "St Georges", "Intermédiaire 1", "Intermédiaire 2", "Grand Prix", "Autre"].map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Note (%)"
                    type="number"
                    value={form.dressage_note_pct}
                    onChange={(e) => setForm({ ...form, dressage_note_pct: e.target.value })}
                    placeholder="68.5"
                    step="0.01"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            )}

            {/* Score générique pour les autres disciplines */}
            {form.discipline !== "CSO" && form.discipline !== "CCE" && form.discipline !== "Dressage" && (
              <Input
                label="Score / Points"
                type="number"
                value={form.score}
                onChange={(e) => setForm({ ...form, score: e.target.value })}
                placeholder="0.0"
                step="0.01"
              />
            )}
          </>)}

          {/* Nb. partants visible pour abandonné/éliminé aussi */}
          {!showResultFields && showPartants && (
            <Input
              label="Nb. partants"
              type="number"
              value={form.total_riders}
              onChange={(e) => setForm({ ...form, total_riders: e.target.value })}
              placeholder="20"
              min="1"
            />
          )}
        </div>
      )}

      {/* TRAV-28-15 — Section Budget (tous statuts) */}
      <div className="space-y-3 pt-1 border-t border-gray-100">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Budget</p>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Engagement (€)" type="number" value={form.budget_engagement} onChange={(e) => setForm({ ...form, budget_engagement: e.target.value })} placeholder="0" min="0" step="0.01" />
          <Input label="Transport (€)" type="number" value={form.budget_transport} onChange={(e) => setForm({ ...form, budget_transport: e.target.value })} placeholder="0" min="0" step="0.01" />
          <Input label="Box / Pension (€)" type="number" value={form.budget_box} onChange={(e) => setForm({ ...form, budget_box: e.target.value })} placeholder="0" min="0" step="0.01" />
          <Input label="Coaching (€)" type="number" value={form.budget_coaching} onChange={(e) => setForm({ ...form, budget_coaching: e.target.value })} placeholder="0" min="0" step="0.01" />
          <Input label="Frais divers (€)" type="number" value={form.budget_divers} onChange={(e) => setForm({ ...form, budget_divers: e.target.value })} placeholder="0" min="0" step="0.01" />
          <Input label="Détail divers" value={form.budget_divers_detail} onChange={(e) => setForm({ ...form, budget_divers_detail: e.target.value })} placeholder="Maréchal, vétérinaire..." />
        </div>
        {budgetTotal > 0 && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 border border-gray-200">
            <span className="text-xs font-semibold text-gray-500">Total</span>
            <span className="text-sm font-black text-black">{budgetTotal.toFixed(2)} €</span>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">Annuler</Button>
        <Button type="submit" loading={loading} className="flex-1">
          {defaultValues?.id ? "Mettre à jour" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
