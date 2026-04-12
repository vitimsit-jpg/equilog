"use client";

import { useState, useEffect, useTransition } from "react";
import { format, differenceInDays, addDays } from "date-fns";
import { Save, Play, Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import type { TrainingPlannedSession, TrainingWeekTemplate, TrainingType } from "@/lib/supabase/types";

interface Props {
  open: boolean;
  onClose: () => void;
  horseId: string;
  weekStart: Date;
  plannedSessions: TrainingPlannedSession[];
}

export default function WeekTemplateModal({ open, onClose, horseId, weekStart, plannedSessions }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [templates, setTemplates] = useState<TrainingWeekTemplate[]>([]);
  const [saveName, setSaveName] = useState("Ma semaine type");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("training_week_templates")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setTemplates((data || []) as unknown as TrainingWeekTemplate[]);
      });
  }, [open, supabase]);

  const handleSave = async () => {
    if (!saveName.trim()) { toast.error("Nom requis"); return; }
    setLoading(true);

    const weekPlanned = plannedSessions.filter(
      (p) => p.horse_id === horseId && p.status === "planned"
    );

    const sessions = weekPlanned.map((p) => ({
      day_offset: differenceInDays(new Date(p.date), weekStart),
      type: p.type,
      duration_min: p.duration_min_target ?? 45,
      intensity: p.intensity_target ?? 3,
      qui_sen_occupe: p.qui_sen_occupe ?? null,
      notes: p.notes ?? null,
    }));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); toast.error("Non connecté"); return; }

    const { error } = await supabase.from("training_week_templates").insert({
      user_id: user.id,
      name: saveName.trim(),
      horse_id: horseId,
      sessions,
    });

    setLoading(false);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success("Template sauvegardé !");
    onClose();
  };

  const handleApply = async (template: TrainingWeekTemplate) => {
    setLoading(true);
    const toInsert = template.sessions.map((s) => ({
      horse_id: horseId,
      date: format(addDays(weekStart, s.day_offset), "yyyy-MM-dd"),
      type: s.type as TrainingType,
      duration_min_target: s.duration_min,
      intensity_target: Math.min(5, Math.max(1, s.intensity)) as 1 | 2 | 3 | 4 | 5,
      qui_sen_occupe: s.qui_sen_occupe,
      notes: s.notes,
      status: "planned" as const,
    }));

    const { error } = await supabase.from("training_planned_sessions").insert(toInsert as Partial<TrainingPlannedSession>[]);
    setLoading(false);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success(`${toInsert.length} séance(s) planifiée(s) !`);
    startTransition(() => router.refresh());
    onClose();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("training_week_templates").delete().eq("id", id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    toast.success("Template supprimé");
  };

  return (
    <Modal open={open} onClose={onClose} title="Semaines types">
      <div className="space-y-6">
        {/* Sauvegarder la semaine courante */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Sauvegarder cette semaine</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Nom du template"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange"
            />
            <button
              onClick={handleSave}
              disabled={loading}
              className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              Sauver
            </button>
          </div>
        </div>

        {/* Templates existants */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
            Mes templates ({templates.length})
          </p>
          {templates.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Aucun template sauvegardé</p>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-black truncate">{t.name}</p>
                    <p className="text-2xs text-gray-400">{t.sessions.length} séance{t.sessions.length > 1 ? "s" : ""}</p>
                  </div>
                  <button
                    onClick={() => handleApply(t)}
                    disabled={loading}
                    className="p-2 rounded-lg bg-orange-light text-orange hover:bg-orange/10 transition-colors"
                    title="Appliquer"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
