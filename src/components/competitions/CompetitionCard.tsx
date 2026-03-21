"use client";

import { useState } from "react";
import type { Competition } from "@/lib/supabase/types";
import { formatDate, DISCIPLINE_LABELS } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import { Trophy, MapPin, Edit2, Trash2, Link2, Check } from "lucide-react";
import MediaGallery from "@/components/media/MediaGallery";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import CompetitionForm from "./CompetitionForm";
import { isAfter, startOfDay, parseISO } from "date-fns";

interface Props {
  competition: Competition;
  horseId: string;
  hasLinkedSession?: boolean;
}

export default function CompetitionCard({ competition: c, horseId, hasLinkedSession }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);

  const isPast = !isAfter(startOfDay(parseISO(c.date)), startOfDay(new Date()));

  const handleDelete = async () => {
    if (!confirm("Supprimer ce concours ?")) return;
    await supabase.from("competitions").delete().eq("id", c.id);
    toast.success("Concours supprimé");
    router.refresh();
  };

  const handleCreateLinkedSession = async () => {
    setCreatingSession(true);
    const { error } = await supabase.from("training_sessions").insert({
      horse_id: horseId,
      date: c.date,
      type: "concours",
      duration_min: 60,
      intensity: 4,
      feeling: 3,
      notes: null,
      objectif: null,
      lieu: c.location || null,
      coach_present: false,
      rider: "owner",
      equipement_recuperation: null,
      wearable_source: null,
      linked_competition_id: c.id,
    });
    if (error) toast.error("Erreur lors de la création de la séance");
    else { toast.success("Séance de concours créée !"); router.refresh(); }
    setCreatingSession(false);
  };

  const percentile = c.result_rank && c.total_riders
    ? Math.round(((c.total_riders - c.result_rank) / c.total_riders) * 100)
    : null;

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-beige flex items-center justify-center flex-shrink-0">
            <Trophy className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h3 className="font-bold text-black">{c.event_name}</h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-gray-400">{formatDate(c.date)}</span>
              <Badge variant="gray">{DISCIPLINE_LABELS[c.discipline] || c.discipline}</Badge>
              <Badge variant="black">{c.level}</Badge>
            </div>
            {c.location && (
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                <MapPin className="h-3 w-3" />
                {c.location}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {c.result_rank && c.total_riders && (
            <div className="text-right">
              <div className="text-xl font-black text-black">
                {c.result_rank}<span className="text-sm text-gray-400">/{c.total_riders}</span>
              </div>
              {percentile !== null && (
                <div className="text-xs font-semibold text-orange">Top {100 - percentile}%</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MediaGallery
              entityType="competition"
              entityId={c.id}
              horseId={horseId}
              initialMediaUrls={c.media_urls ?? []}
            />
            {isPast && (
              hasLinkedSession ? (
                <span className="flex items-center gap-1 text-2xs font-semibold px-2 py-1 rounded-full bg-green-50 text-success">
                  <Check className="h-3 w-3" /> Séance liée
                </span>
              ) : (
                <button
                  onClick={handleCreateLinkedSession}
                  disabled={creatingSession}
                  className="flex items-center gap-1 text-2xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-500 hover:bg-orange-light hover:text-orange transition-all disabled:opacity-50"
                >
                  <Link2 className="h-3 w-3" />
                  {creatingSession ? "Création…" : "Créer séance"}
                </button>
              )
            )}
          </div>
          <div className="flex gap-1">
            <button onClick={() => setEditOpen(true)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-black transition-colors">
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={handleDelete} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-danger transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {editOpen && (
        <Modal open={true} onClose={() => setEditOpen(false)} title="Modifier le concours" size="lg">
          <CompetitionForm
            horseId={horseId}
            defaultValues={c}
            onSaved={() => { setEditOpen(false); router.refresh(); }}
            onCancel={() => setEditOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
}
