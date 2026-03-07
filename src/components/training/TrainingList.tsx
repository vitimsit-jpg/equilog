"use client";

import { useState } from "react";
import type { TrainingSession } from "@/lib/supabase/types";
import { formatDate, TRAINING_TYPE_LABELS } from "@/lib/utils";
import { Dumbbell, Edit2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import TrainingForm from "./TrainingForm";
import EmptyState from "@/components/ui/EmptyState";

interface Props {
  sessions: TrainingSession[];
  horseId: string;
}

export default function TrainingList({ sessions, horseId }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [editSession, setEditSession] = useState<TrainingSession | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette séance ?")) return;
    const { error } = await supabase.from("training_sessions").delete().eq("id", id);
    if (error) toast.error("Erreur");
    else { toast.success("Séance supprimée"); router.refresh(); }
  };

  if (sessions.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={Dumbbell}
          title="Aucune séance"
          description="Commencez à enregistrer vos séances de travail."
        />
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="font-bold text-black text-sm mb-4">Séances ({sessions.length})</h3>
      <div className="space-y-2">
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-beige flex items-center justify-center flex-shrink-0">
                <Dumbbell className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-black">{TRAINING_TYPE_LABELS[s.type]}</span>
                  <span className="text-xs text-gray-400">{s.duration_min}min</span>
                </div>
                <span className="text-xs text-gray-400">{formatDate(s.date)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`w-1.5 h-4 rounded-full ${i < s.intensity ? "bg-orange" : "bg-gray-200"}`} />
                ))}
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`w-1.5 h-4 rounded-full ${i < s.feeling ? "bg-success" : "bg-gray-200"}`} />
                ))}
              </div>
              <button onClick={() => setEditSession(s)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-black">
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => handleDelete(s.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-danger">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {editSession && (
        <Modal open={true} onClose={() => setEditSession(null)} title="Modifier la séance">
          <TrainingForm
            horseId={horseId}
            defaultValues={editSession}
            onSaved={() => { setEditSession(null); router.refresh(); }}
            onCancel={() => setEditSession(null)}
          />
        </Modal>
      )}
    </div>
  );
}
