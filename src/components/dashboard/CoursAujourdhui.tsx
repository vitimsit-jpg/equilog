"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Check, Clock, X } from "lucide-react";
import toast from "react-hot-toast";
import type { CoachStudent, CoachPlannedSession } from "@/lib/supabase/types";

interface SessionWithStudent extends CoachPlannedSession {
  coach_students: CoachStudent;
}

interface Props {
  todaySessions: SessionWithStudent[];
  students: CoachStudent[];
  today: string;
}

export default function CoursAujourdhui({ todaySessions: initial, students, today }: Props) {
  const [sessions, setSessions] = useState<SessionWithStudent[]>(initial);
  const [showAdd, setShowAdd] = useState(false);
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [timeSlot, setTimeSlot] = useState("");
  const [durationMin, setDurationMin] = useState(60);
  const [notes, setNotes] = useState("");
  const supabase = createClient();

  const complete = async (id: string) => {
    const { error } = await supabase.from("coach_planned_sessions").update({ completed: true }).eq("id", id);
    if (!error) setSessions((prev) => prev.map((s) => s.id === id ? { ...s, completed: true } : s));
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce cours ?")) return;
    const { error } = await supabase.from("coach_planned_sessions").delete().eq("id", id);
    if (!error) setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const addSession = async () => {
    if (!studentId) return;
    const { data, error } = await supabase
      .from("coach_planned_sessions")
      .insert({ student_id: studentId, date: today, time_slot: timeSlot || null, duration_min: durationMin, notes: notes || null })
      .select("*, coach_students(*)")
      .single();
    if (!error && data) {
      setSessions((prev) => [...prev, data as unknown as SessionWithStudent].sort((a, b) => (a.time_slot ?? "").localeCompare(b.time_slot ?? "")));
      setShowAdd(false);
      setTimeSlot("");
      setNotes("");
      toast.success("Cours ajouté");
    }
  };

  const pending = sessions.filter((s) => !s.completed);
  const done = sessions.filter((s) => s.completed);

  if (students.length === 0) {
    return (
      <div className="card p-4 text-center">
        <p className="text-sm text-gray-400 mb-2">Aucun élève enregistré</p>
        <a href="/settings#coach" className="text-xs font-semibold text-orange hover:underline">
          Ajouter des élèves dans les paramètres →
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-black">Mes cours du jour</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs text-gray-400 hover:text-orange transition-colors font-medium flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter
        </button>
      </div>

      {showAdd && (
        <div className="card p-4 mb-3 space-y-3">
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange bg-white"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.student_name}{s.horse_name ? ` — ${s.horse_name}` : ""}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
              placeholder="Horaire (ex: 10h30)"
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange"
            />
            <select
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value))}
              className="w-28 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange bg-white"
            >
              {[30, 45, 60, 90, 120].map((d) => (
                <option key={d} value={d}>{d}min</option>
              ))}
            </select>
          </div>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optionnel)"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-orange"
          />
          <div className="flex gap-2">
            <button onClick={addSession} className="flex-1 btn-primary py-1.5 text-sm">Ajouter</button>
            <button onClick={() => setShowAdd(false)} className="px-3 text-sm text-gray-400 hover:text-black">Annuler</button>
          </div>
        </div>
      )}

      <div className="card divide-y divide-gray-50">
        {sessions.length === 0 && (
          <p className="text-sm text-gray-400 p-4 text-center">Aucun cours planifié aujourd&apos;hui</p>
        )}
        {pending.map((s) => (
          <div key={s.id} className="flex items-center gap-3 p-3 group">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-black">{s.coach_students.student_name}</p>
                {s.coach_students.horse_name && (
                  <span className="text-xs text-gray-400">· {s.coach_students.horse_name}</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                {s.time_slot && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.time_slot}</span>}
                {s.duration_min && <span>{s.duration_min}min</span>}
                {s.notes && <span className="italic truncate">{s.notes}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => complete(s.id)} className="text-green-500 hover:text-green-700 p-1" title="Marquer fait">
                <Check className="h-4 w-4" />
              </button>
              <button onClick={() => remove(s.id)} className="text-gray-300 hover:text-red-400 p-1" title="Supprimer">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {done.length > 0 && (
          <>
            <div className="px-3 py-1 bg-gray-50">
              <span className="text-xs text-gray-400">{done.length} cours terminé{done.length > 1 ? "s" : ""}</span>
            </div>
            {done.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3 opacity-40">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                <p className="text-sm line-through text-gray-500">{s.coach_students.student_name}</p>
                {s.time_slot && <span className="text-xs text-gray-400">{s.time_slot}</span>}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
