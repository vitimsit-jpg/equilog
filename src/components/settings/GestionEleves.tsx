"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, UserCheck } from "lucide-react";
import toast from "react-hot-toast";
import type { CoachStudent } from "@/lib/supabase/types";

interface Props {
  initialStudents: CoachStudent[];
}

export default function GestionEleves({ initialStudents }: Props) {
  const [students, setStudents] = useState<CoachStudent[]>(initialStudents);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [horseName, setHorseName] = useState("");
  const [notes, setNotes] = useState("");
  const supabase = createClient();

  const add = async () => {
    if (!name.trim()) return;
    const { data, error } = await supabase
      .from("coach_students")
      .insert({ student_name: name.trim(), student_email: email || null, horse_name: horseName || null, notes: notes || null })
      .select()
      .single();
    if (!error && data) {
      setStudents((prev) => [...prev, data as CoachStudent]);
      setName(""); setEmail(""); setHorseName(""); setNotes("");
      setShowAdd(false);
      toast.success("Élève ajouté");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cet élève ?")) return;
    const { error } = await supabase.from("coach_students").delete().eq("id", id);
    if (error) { toast.error("Erreur lors de la suppression"); return; }
    setStudents((prev) => prev.filter((s) => s.id !== id));
    toast.success("Élève supprimé");
  };

  return (
    <div id="coach" className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-orange" />
          <h3 className="font-bold text-black">Mes élèves</h3>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs text-gray-400 hover:text-orange font-medium flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter
        </button>
      </div>

      {showAdd && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de l'élève *" className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange col-span-2" />
            <input value={horseName} onChange={(e) => setHorseName(e.target.value)} placeholder="Nom du cheval" className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optionnel)" type="email" className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange" />
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange col-span-2" />
          </div>
          <div className="flex gap-2">
            <button onClick={add} className="flex-1 btn-primary py-1.5 text-sm">Ajouter</button>
            <button onClick={() => setShowAdd(false)} className="px-3 text-sm text-gray-400 hover:text-black">Annuler</button>
          </div>
        </div>
      )}

      {students.length === 0 && !showAdd && (
        <p className="text-sm text-gray-400 text-center py-2">Aucun élève enregistré</p>
      )}

      <div className="divide-y divide-gray-50">
        {students.filter((s) => s.active).map((student) => (
          <div key={student.id} className="flex items-center justify-between py-3 group">
            <div>
              <p className="text-sm font-medium text-black">{student.student_name}</p>
              <p className="text-xs text-gray-400">
                {[student.horse_name, student.student_email].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
            <button
              onClick={() => remove(student.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
