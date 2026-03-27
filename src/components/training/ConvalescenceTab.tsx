"use client";

/**
 * TRAV-22 — Onglet Convalescence pour les chevaux en mode IR
 * Gestion des praticiens référents + examens médicaux + extraction IA
 */

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import {
  Phone, Mail, Plus, Edit3, Trash2, X,
  FileText, Sparkles, ChevronDown, ChevronUp, Star, Paperclip, ExternalLink,
} from "lucide-react";
import type { HorsePractitioner, HorseMedicalExam, PractitionerType, MedicalExamType } from "@/lib/supabase/types";
import Modal from "@/components/ui/Modal";

const PRACTITIONER_LABELS: Record<PractitionerType, string> = {
  vet:       "Vétérinaire",
  osteo:     "Ostéopathe",
  physio:    "Physiothérapeute",
  kine:      "Kinésithérapeute",
  marechal:  "Maréchal-ferrant",
  dentiste:  "Dentiste équin",
  autre:     "Autre",
};

const PRACTITIONER_COLORS: Record<PractitionerType, string> = {
  vet:      "bg-red-100 text-red-700",
  osteo:    "bg-purple-100 text-purple-700",
  physio:   "bg-blue-100 text-blue-700",
  kine:     "bg-cyan-100 text-cyan-700",
  marechal: "bg-amber-100 text-amber-700",
  dentiste: "bg-green-100 text-green-700",
  autre:    "bg-gray-100 text-gray-600",
};

const EXAM_TYPE_LABELS: Record<MedicalExamType, string> = {
  radio:          "Radiographie",
  echo:           "Échographie",
  endoscopie:     "Endoscopie",
  bilan_sanguin:  "Bilan sanguin",
  scintigraphie:  "Scintigraphie",
  irm:            "IRM",
  autre:          "Autre",
};

interface Props {
  horseId: string;
  horseName?: string;
}

const PRACTITIONER_TYPE_OPTIONS: PractitionerType[] = ["vet", "osteo", "physio", "kine", "marechal", "dentiste", "autre"];
const EXAM_TYPE_OPTIONS: MedicalExamType[] = ["radio", "echo", "endoscopie", "bilan_sanguin", "scintigraphie", "irm", "autre"];

export default function ConvalescenceTab({ horseId, horseName }: Props) {
  const supabase = createClient();

  const [practitioners, setPractitioners] = useState<HorsePractitioner[]>([]);
  const [exams, setExams] = useState<HorseMedicalExam[]>([]);
  const [loading, setLoading] = useState(true);

  // Practitioners modal state
  const [showPractModal, setShowPractModal] = useState(false);
  const [editingPract, setEditingPract] = useState<HorsePractitioner | null>(null);
  const [practForm, setPractForm] = useState({ type: "vet" as PractitionerType, nom: "", telephone: "", email: "", notes: "", principal: false });
  const [savingPract, setSavingPract] = useState(false);

  // Exams modal state
  const [showExamModal, setShowExamModal] = useState(false);
  const [editingExam, setEditingExam] = useState<HorseMedicalExam | null>(null);
  const [examForm, setExamForm] = useState({ type: "echo" as MedicalExamType, date: "", description: "", vet_name: "", results: "" });
  const [savingExam, setSavingExam] = useState(false);

  // File upload state
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, { url: string; name: string; isPdf: boolean }[]>>({});

  // AI extract state
  const [extractingExamId, setExtractingExamId] = useState<string | null>(null);
  const [extractResult, setExtractResult] = useState<{ examId: string; text: string } | null>(null);

  // Expand state for exams
  const [expandedExam, setExpandedExam] = useState<string | null>(null);

  useEffect(() => { load(); }, [horseId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    const [{ data: practs }, { data: exs }] = await Promise.all([
      supabase.from("horse_practitioners").select("*").eq("horse_id", horseId).order("principal", { ascending: false }).order("created_at"),
      supabase.from("horse_medical_exams").select("*").eq("horse_id", horseId).order("date", { ascending: false }),
    ]);
    setPractitioners((practs as HorsePractitioner[]) ?? []);
    setExams((exs as HorseMedicalExam[]) ?? []);
    setLoading(false);
  }

  // ── Practitioners CRUD ────────────────────────────────────────────────────

  function openAddPract() {
    setEditingPract(null);
    setPractForm({ type: "vet", nom: "", telephone: "", email: "", notes: "", principal: false });
    setShowPractModal(true);
  }

  function openEditPract(p: HorsePractitioner) {
    setEditingPract(p);
    setPractForm({ type: p.type, nom: p.nom, telephone: p.telephone ?? "", email: p.email ?? "", notes: p.notes ?? "", principal: p.principal });
    setShowPractModal(true);
  }

  async function savePractitioner() {
    if (!practForm.nom.trim()) { toast.error("Le nom est requis"); return; }
    setSavingPract(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingPract(false); return; }

    const payload = {
      horse_id: horseId,
      user_id: user.id,
      type: practForm.type,
      nom: practForm.nom.trim(),
      telephone: practForm.telephone.trim() || null,
      email: practForm.email.trim() || null,
      notes: practForm.notes.trim() || null,
      principal: practForm.principal,
    };

    if (editingPract) {
      const { error } = await supabase.from("horse_practitioners").update(payload).eq("id", editingPract.id);
      if (error) { toast.error("Erreur"); setSavingPract(false); return; }
      toast.success("Praticien mis à jour");
    } else {
      const { error } = await supabase.from("horse_practitioners").insert(payload);
      if (error) { toast.error("Erreur"); setSavingPract(false); return; }
      toast.success("Praticien ajouté");
    }
    setSavingPract(false);
    setShowPractModal(false);
    load();
  }

  async function deletePractitioner(id: string) {
    const { error } = await supabase.from("horse_practitioners").delete().eq("id", id);
    if (error) { toast.error("Erreur"); return; }
    setPractitioners((prev) => prev.filter((p) => p.id !== id));
    toast.success("Praticien supprimé");
  }

  // ── Medical Exams CRUD ────────────────────────────────────────────────────

  function openAddExam() {
    setEditingExam(null);
    setExamForm({ type: "echo", date: new Date().toISOString().slice(0, 10), description: "", vet_name: "", results: "" });
    setPendingFiles([]);
    setShowExamModal(true);
  }

  function openEditExam(e: HorseMedicalExam) {
    setEditingExam(e);
    setExamForm({ type: e.type, date: e.date, description: e.description ?? "", vet_name: e.vet_name ?? "", results: e.results ?? "" });
    setPendingFiles([]);
    setShowExamModal(true);
  }

  async function saveExam() {
    if (!examForm.date) { toast.error("La date est requise"); return; }
    setSavingExam(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingExam(false); return; }

    const payload = {
      horse_id: horseId,
      user_id: user.id,
      type: examForm.type,
      date: examForm.date,
      description: examForm.description.trim() || null,
      vet_name: examForm.vet_name.trim() || null,
      results: examForm.results.trim() || null,
    };

    let examId: string;
    if (editingExam) {
      const { error } = await supabase.from("horse_medical_exams").update(payload).eq("id", editingExam.id);
      if (error) { toast.error("Erreur"); setSavingExam(false); return; }
      examId = editingExam.id;
    } else {
      const { data: inserted, error } = await supabase.from("horse_medical_exams").insert(payload).select("id").single();
      if (error || !inserted) { toast.error("Erreur"); setSavingExam(false); return; }
      examId = (inserted as { id: string }).id;
    }

    // Upload pending files if any
    if (pendingFiles.length > 0) {
      const ts = Date.now();
      const uploadedPaths: string[] = [];
      for (const file of pendingFiles) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${horseId}/${examId}/${ts}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("medical-images")
          .upload(path, file, { upsert: false });
        if (!uploadError) uploadedPaths.push(path);
      }
      if (uploadedPaths.length > 0) {
        const existing = editingExam?.media_urls ?? [];
        await supabase
          .from("horse_medical_exams")
          .update({ media_urls: [...existing, ...uploadedPaths] })
          .eq("id", examId);
      }
    }

    toast.success(editingExam ? "Examen mis à jour" : "Examen ajouté");
    setSavingExam(false);
    setShowExamModal(false);
    load();
  }

  async function deleteExam(id: string) {
    const { error } = await supabase.from("horse_medical_exams").delete().eq("id", id);
    if (error) { toast.error("Erreur"); return; }
    setExams((prev) => prev.filter((e) => e.id !== id));
    toast.success("Examen supprimé");
  }

  // ── Signed URLs for media ─────────────────────────────────────────────────

  async function loadSignedUrls(exam: HorseMedicalExam) {
    if (!exam.media_urls || exam.media_urls.length === 0) return;
    if (signedUrls[exam.id]) return; // already loaded
    const results: { url: string; name: string; isPdf: boolean }[] = [];
    for (const path of exam.media_urls) {
      const { data } = await supabase.storage.from("medical-images").createSignedUrl(path, 3600);
      if (data?.signedUrl) {
        const fileName = path.split("/").pop() ?? path;
        results.push({ url: data.signedUrl, name: fileName, isPdf: fileName.toLowerCase().endsWith(".pdf") });
      }
    }
    setSignedUrls((prev) => ({ ...prev, [exam.id]: results }));
  }

  function toggleExam(exam: HorseMedicalExam) {
    const isExpanded = expandedExam === exam.id;
    setExpandedExam(isExpanded ? null : exam.id);
    if (!isExpanded) loadSignedUrls(exam);
  }

  // ── AI Extract Protocol ────────────────────────────────────────────────────

  async function extractProtocol(exam: HorseMedicalExam) {
    if (!exam.results && !exam.description) {
      toast.error("Aucun résultat ni description pour cet examen");
      return;
    }
    setExtractingExamId(exam.id);
    try {
      const res = await fetch("/api/extract-protocol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          horseId,
          horseName: horseName ?? "ce cheval",
          examType: EXAM_TYPE_LABELS[exam.type],
          examDate: exam.date,
          vetName: exam.vet_name,
          description: exam.description,
          results: exam.results,
        }),
      });
      if (!res.ok) throw new Error();
      const { recommendation } = await res.json();
      setExtractResult({ examId: exam.id, text: recommendation });
    } catch {
      toast.error("Erreur lors de l'analyse IA");
    }
    setExtractingExamId(null);
  }

  if (loading) {
    return <div className="card flex items-center justify-center py-12 text-sm text-gray-400">Chargement…</div>;
  }

  return (
    <div className="space-y-4">
      {/* ── Section Praticiens ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-black">Praticiens référents</p>
          <button onClick={openAddPract} className="flex items-center gap-1 text-2xs font-semibold text-orange hover:text-orange/80">
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </button>
        </div>

        {practitioners.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-sm text-gray-400">Aucun praticien enregistré</p>
            <button onClick={openAddPract} className="btn-primary text-xs px-4 py-2">
              <Plus className="h-3.5 w-3.5 inline mr-1" />
              Ajouter un praticien
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {practitioners.map((p) => (
              <div key={p.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${PRACTITIONER_COLORS[p.type]}`}>
                      {PRACTITIONER_LABELS[p.type]}
                    </span>
                    {p.principal && (
                      <Star className="h-3 w-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm font-semibold text-black mt-0.5">{p.nom}</p>
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    {p.telephone && (
                      <a href={`tel:${p.telephone}`} className="flex items-center gap-1 text-2xs text-gray-400 hover:text-orange">
                        <Phone className="h-3 w-3" />{p.telephone}
                      </a>
                    )}
                    {p.email && (
                      <a href={`mailto:${p.email}`} className="flex items-center gap-1 text-2xs text-gray-400 hover:text-orange">
                        <Mail className="h-3 w-3" />{p.email}
                      </a>
                    )}
                    {p.notes && <p className="text-2xs text-gray-400 italic mt-0.5">{p.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEditPract(p)} className="p-1 text-gray-400 hover:text-gray-600">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => deletePractitioner(p.id)} className="p-1 text-gray-300 hover:text-danger">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section Examens médicaux ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-black">Examens médicaux</p>
          <button onClick={openAddExam} className="flex items-center gap-1 text-2xs font-semibold text-orange hover:text-orange/80">
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </button>
        </div>

        {exams.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-sm text-gray-400">Aucun examen enregistré</p>
            <button onClick={openAddExam} className="btn-secondary text-xs px-4 py-2">
              <Plus className="h-3.5 w-3.5 inline mr-1" />
              Ajouter un examen
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {exams.map((exam) => {
              const isExpanded = expandedExam === exam.id;
              const aiResult = extractResult?.examId === exam.id ? extractResult.text : null;
              return (
                <div key={exam.id} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="flex items-start gap-3 p-3">
                    <FileText className="h-4 w-4 text-gray-300 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-black">{EXAM_TYPE_LABELS[exam.type]}</p>
                        <span className="text-2xs text-gray-400">
                          {new Date(exam.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      {exam.vet_name && <p className="text-2xs text-gray-400 mt-0.5">Dr {exam.vet_name}</p>}
                      {exam.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{exam.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleExam(exam)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => openEditExam(exam)} className="p-1 text-gray-400 hover:text-gray-600">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteExam(exam.id)} className="p-1 text-gray-300 hover:text-danger">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-50 px-3 pb-3 space-y-2">
                      {exam.results && (
                        <div>
                          <p className="text-2xs font-bold text-gray-500 uppercase tracking-wide mb-1">Résultats</p>
                          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{exam.results}</p>
                        </div>
                      )}

                      {/* Media files */}
                      {signedUrls[exam.id] && signedUrls[exam.id].length > 0 && (
                        <div>
                          <p className="text-2xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Documents</p>
                          <div className="flex flex-wrap gap-2">
                            {signedUrls[exam.id].map((f, i) => (
                              f.isPdf ? (
                                <a
                                  key={i}
                                  href={f.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-2xs text-blue-600 hover:text-blue-800 px-2.5 py-1.5 bg-blue-50 rounded-lg border border-blue-100"
                                >
                                  <FileText className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate max-w-[120px]">{f.name.replace(/^\d+-/, "")}</span>
                                  <ExternalLink className="h-2.5 w-2.5 flex-shrink-0" />
                                </a>
                              ) : (
                                <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="block">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={f.url}
                                    alt={f.name}
                                    className="h-20 w-20 object-cover rounded-lg border border-gray-100 hover:opacity-90 transition-opacity"
                                  />
                                </a>
                              )
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI extract */}
                      {(exam.results || exam.description) && (
                        <div>
                          {aiResult ? (
                            <div className="px-3 py-2.5 bg-purple-50 rounded-xl border border-purple-100">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                                <p className="text-2xs font-bold text-purple-700">Recommandation IA</p>
                              </div>
                              <p className="text-xs text-purple-700 leading-relaxed whitespace-pre-line">{aiResult}</p>
                            </div>
                          ) : (
                            <button
                              onClick={() => extractProtocol(exam)}
                              disabled={extractingExamId === exam.id}
                              className="flex items-center gap-1.5 text-2xs font-semibold text-purple-600 hover:text-purple-700 disabled:opacity-50"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              {extractingExamId === exam.id ? "Analyse en cours…" : "Analyser avec l'IA"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal Praticien ── */}
      <Modal
        open={showPractModal}
        onClose={() => setShowPractModal(false)}
        title={editingPract ? "Modifier le praticien" : "Ajouter un praticien"}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Type</label>
            <div className="flex flex-wrap gap-2">
              {PRACTITIONER_TYPE_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPractForm((f) => ({ ...f, type: t }))}
                  className={`text-2xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
                    practForm.type === t
                      ? "border-orange bg-orange-light text-orange"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {PRACTITIONER_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Nom *</label>
            <input
              value={practForm.nom}
              onChange={(e) => setPractForm((f) => ({ ...f, nom: e.target.value }))}
              placeholder="Dr Dupont"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Téléphone</label>
              <input
                type="tel"
                value={practForm.telephone}
                onChange={(e) => setPractForm((f) => ({ ...f, telephone: e.target.value }))}
                placeholder="06 12 34 56 78"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={practForm.email}
                onChange={(e) => setPractForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="dr@exemple.fr"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange"
              />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <input
              value={practForm.notes}
              onChange={(e) => setPractForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Spécialité, cabinet, infos utiles…"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setPractForm((f) => ({ ...f, principal: !f.principal }))}
              className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${practForm.principal ? "bg-orange" : "bg-gray-200"}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm m-0.5 transition-transform ${practForm.principal ? "translate-x-4" : "translate-x-0"}`} />
            </div>
            <span className="text-sm text-gray-700">Praticien principal / référent</span>
          </label>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowPractModal(false)} className="flex-1 btn-secondary text-sm py-2.5">Annuler</button>
            <button onClick={savePractitioner} disabled={savingPract} className="flex-1 btn-primary text-sm py-2.5">
              {savingPract ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal Examen médical ── */}
      <Modal
        open={showExamModal}
        onClose={() => setShowExamModal(false)}
        title={editingExam ? "Modifier l'examen" : "Ajouter un examen médical"}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Type d'examen</label>
            <div className="flex flex-wrap gap-2">
              {EXAM_TYPE_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setExamForm((f) => ({ ...f, type: t }))}
                  className={`text-2xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
                    examForm.type === t
                      ? "border-orange bg-orange-light text-orange"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {EXAM_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input
                type="date"
                value={examForm.date}
                onChange={(e) => setExamForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange"
              />
            </div>
            <div>
              <label className="label">Vétérinaire</label>
              <input
                value={examForm.vet_name}
                onChange={(e) => setExamForm((f) => ({ ...f, vet_name: e.target.value }))}
                placeholder="Dr Martin"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange"
              />
            </div>
          </div>
          <div>
            <label className="label">Description / motif</label>
            <input
              value={examForm.description}
              onChange={(e) => setExamForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Ex: Contrôle tendon fléchisseur, J+30 post-blessure"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange"
            />
          </div>
          <div>
            <label className="label">Résultats <span className="font-normal text-gray-300">(requis pour l'analyse IA)</span></label>
            <textarea
              value={examForm.results}
              onChange={(e) => setExamForm((f) => ({ ...f, results: e.target.value }))}
              rows={4}
              placeholder="Saisir les résultats, conclusions du vétérinaire, restrictions…"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange resize-none"
            />
          </div>
          <div>
            <label className="label">Images / Documents</label>
            <label
              htmlFor="exam-file-input"
              className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-200 rounded-xl py-3 cursor-pointer hover:border-gray-300 transition-colors"
            >
              <Paperclip className="h-4 w-4 text-gray-300" />
              <span className="text-xs text-gray-400">Ajouter des images ou PDF</span>
              <input
                id="exam-file-input"
                type="file"
                multiple
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => setPendingFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
              />
            </label>
            {pendingFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {pendingFiles.map((file, i) => (
                  <div key={i} className="flex items-center justify-between px-2.5 py-1.5 bg-gray-50 rounded-lg">
                    <span className="text-2xs text-gray-600 truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="ml-2 flex-shrink-0 text-gray-300 hover:text-danger"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowExamModal(false)} className="flex-1 btn-secondary text-sm py-2.5">Annuler</button>
            <button onClick={saveExam} disabled={savingExam} className="flex-1 btn-primary text-sm py-2.5">
              {savingExam ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
