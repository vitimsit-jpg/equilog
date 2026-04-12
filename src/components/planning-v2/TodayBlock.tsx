"use client";

import { useState, useEffect, useTransition } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, SkipForward, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import type { TrainingPlannedSession } from "@/lib/supabase/types";
import { getTypeEmoji, getTypeLabel } from "./constants";

interface HorseSlim {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface Props {
  horses: HorseSlim[];
  plannedToday: TrainingPlannedSession[];
}

export default function TodayBlock({ horses, plannedToday }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  const todayLabel = format(new Date(), "EEEE d MMMM", { locale: fr });

  const activePlanned = plannedToday.filter(
    (p) => p.status === "planned" && !p.linked_session_id
  );

  const handleCheckDone = async (planned: TrainingPlannedSession) => {
    const { data: newSession, error } = await supabase
      .from("training_sessions")
      .insert({
        horse_id: planned.horse_id,
        date: planned.date,
        type: planned.type,
        duration_min: planned.duration_min_target ?? 45,
        intensity: planned.intensity_target ?? 3,
        feeling: 3,
        rider: planned.qui_sen_occupe ?? null,
        notes: planned.notes ?? null,
      })
      .select("id")
      .single();

    if (error || !newSession) { toast.error("Erreur : " + (error?.message ?? "session non créée")); return; }

    await supabase
      .from("training_planned_sessions")
      .update({ linked_session_id: newSession.id })
      .eq("id", planned.id);

    toast.success("Séance cochée !");
    startTransition(() => router.refresh());
  };

  const handleSkip = async (planned: TrainingPlannedSession) => {
    await supabase
      .from("training_planned_sessions")
      .update({ status: "skipped" })
      .eq("id", planned.id);
    toast.success("Séance reportée");
    startTransition(() => router.refresh());
  };

  const getHorseName = (horseId: string) =>
    horses.find((h) => h.id === horseId)?.name ?? "";

  if (activePlanned.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="font-bold text-black text-sm">Aujourd&apos;hui</h2>
            <p className="text-2xs text-gray-400 capitalize">{todayLabel}</p>
          </div>
          <Link href="/planning" className="text-2xs text-orange hover:underline flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Planifier
          </Link>
        </div>
        <p className="text-xs text-gray-400 text-center py-3">Rien de prévu aujourd&apos;hui</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-bold text-black text-sm">Aujourd&apos;hui</h2>
          <p className="text-2xs text-gray-400 capitalize">{todayLabel}</p>
        </div>
        <span className="text-2xs font-semibold text-orange bg-orange-light px-2 py-0.5 rounded-full">
          {activePlanned.length} séance{activePlanned.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-2">
        {activePlanned.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5">
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{getTypeEmoji(p.type)}</span>
                <span className="text-sm font-semibold text-black">{getTypeLabel(p.type)}</span>
                <span className="text-xs text-gray-400">{p.duration_min_target ?? 45}min</span>
              </div>
              {horses.length > 1 && (
                <p className="text-2xs text-gray-400">{getHorseName(p.horse_id)}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => handleCheckDone(p)}
                className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                title="Fait"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleSkip(p)}
                className="p-2 rounded-lg bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                title="Reporter"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
