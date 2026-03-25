"use client";

/**
 * TRAV-22 — Section examens médicaux (radio, écho, bilan sanguin…)
 * Intégrée dans la page Santé pour les chevaux IR (Convalescence)
 */

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Plus, Microscope, Trash2, FileText } from "lucide-react";
import type { HorseMedicalExam, MedicalExamType } from "@/lib/supabase/types";

const EXAM_TYPES: { value: MedicalExamType; label: string; emoji: string }[] = [
  { value: "radio",          label: "Radiographie",    emoji: "🔬" },
  { value: "echo",           label: "Échographie",     emoji: "📡" },
  { value: "bilan_sanguin",  label: "Bilan sanguin",   emoji: "🩸" },
  { value: "endoscopie",     label: "Endoscopie",      emoji: "🔭" },
  { value: "scintigraphie",  label: "Scintigraphie",   emoji: "⚛️" },
  { value: "irm",            label: "IRM",             emoji: "🧲" },
  { value: "autre",          label: "Autre",           emoji: "📋" },
];

interface Props {
  horseId: string;
}

export default function MedicalExamsSection({ horseId }: Props) {
  const supabase = createClient();
  const [exams, setExams] = useState<HorseMedicalExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Form
  const [examType, setExamType] = useState<MedicalExamType>("radio");
  const [examDate, setExamDate] = useState("");
  const [description, setDescription] = useState("");
  const [vetName, setVetName] = useState("");
  const [results, setResults] = useState("");

  useEffect(() => { load(); }, [horseId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    const { data } = await supabase
      .from("horse_medical_exams")
      .select("*")
      .eq("horse_id", horseId)
      .order("date", { ascending: false });
    setExams((data as HorseMedicalExam[]) ?? []);
    setLoading(false);
  }

  async function addExam() {
    if (!examDate) { toast.error("La date est requise"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("horse_medical_exams").insert({
      horse_id: horseId,
      user_id: user.id,
      date: examDate,
      type: examType,
      description: description.trim() || null,
      vet_name: vetName.trim() || null,
      results: results.trim() || null,
    });
    if (error) { toast.error("Erreur lors de l'ajout"); return; }
    toast.success("Examen enregistré !");
    setShowAdd(false);
    setExamDate(""); setDescription(""); setVetName(""); setResults("");
    load();
  }

  if (loading) return null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Microscope className="h-4 w-4 text-blue-500" />
          <h3 className="font-bold text-black text-sm">Examens médicaux</h3>
          {exams.length > 0 && (
            <span className="text-2xs text-gray-400">{exams.length} examen{exams.length > 1 ? "s" : ""}</span>
          )}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 text-xs font-bold text-black hover:text-orange transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter
        </button>
      </div>

      {exams.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-3">Aucun examen enregistré</p>
      ) : (
        <div className="space-y-2">
          {exams.map((e) => {
            const cfg = EXAM_TYPES.find((t) => t.value === e.type);
            const isOpen = expanded === e.id;
            return (
              <div
                key={e.id}
                className="px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-100"
              >
                <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : e.id)}
                >
                  <span className="text-base">{cfg?.emoji ?? "📋"}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-black">{cfg?.label ?? e.type}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(e.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      {e.vet_name ? ` · Dr ${e.vet_name}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.results && <FileText className="h-3.5 w-3.5 text-blue-400" />}
                    <button
                      onClick={(ev) => { ev.stopPropagation(); supabase.from("horse_medical_exams").delete().eq("id", e.id).then(() => load()); }}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {isOpen && (e.description || e.results) && (
                  <div className="mt-2 pt-2 border-t border-blue-100 space-y-1.5">
                    {e.description && (
                      <div>
                        <p className="text-2xs font-bold text-blue-700 uppercase tracking-wide">Indication</p>
                        <p className="text-xs text-gray-600 mt-0.5">{e.description}</p>
                      </div>
                    )}
                    {e.results && (
                      <div>
                        <p className="text-2xs font-bold text-blue-700 uppercase tracking-wide">Résultats</p>
                        <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap">{e.results}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-black">Ajouter un examen</h3>

            <div>
              <label className="label mb-1.5 block">Type d&apos;examen</label>
              <div className="grid grid-cols-2 gap-2">
                {EXAM_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setExamType(t.value)}
                    className={`text-left px-3 py-2 rounded-xl border text-xs transition-all ${
                      examType === t.value
                        ? "border-orange bg-orange/5 font-semibold"
                        : "border-gray-100 hover:border-gray-300"
                    }`}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label mb-1.5 block">Date *</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
                />
              </div>
              <div>
                <label className="label mb-1.5 block">Vétérinaire</label>
                <input
                  value={vetName}
                  onChange={(e) => setVetName(e.target.value)}
                  placeholder="Dr Dupont"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange/30"
                />
              </div>
            </div>

            <div>
              <label className="label mb-1.5 block">Indication / Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Pourquoi cet examen a été réalisé…"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange/30"
              />
            </div>

            <div>
              <label className="label mb-1.5 block">Résultats</label>
              <textarea
                value={results}
                onChange={(e) => setResults(e.target.value)}
                rows={3}
                placeholder="Conclusions, valeurs, interprétation…"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange/30"
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="btn-ghost flex-1 text-sm py-2.5">Annuler</button>
              <button onClick={addExam} className="btn-primary flex-1 text-sm py-2.5">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
