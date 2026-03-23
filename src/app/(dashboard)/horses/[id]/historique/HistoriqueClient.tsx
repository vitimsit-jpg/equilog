"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileUp } from "lucide-react";
import type { HorseHistoryEvent } from "@/lib/supabase/types";
import HistoriqueTimeline from "@/components/historique/HistoriqueTimeline";
import HistoriqueEventModal from "@/components/historique/HistoriqueEventModal";
import DocumentExtractModal from "@/components/historique/DocumentExtractModal";
import HorseIdentiteCard from "@/components/historique/HorseIdentiteCard";

interface HorseIdentite {
  sire_number: string | null;
  lieu_naissance: string | null;
  conditions_acquisition: string | null;
  historique_avant_acquisition: string | null;
}

interface Props {
  horseId: string;
  horseName: string;
  events: HorseHistoryEvent[];
  horseIdentite: HorseIdentite;
}

export default function HistoriqueClient({ horseId, horseName, events, horseIdentite }: Props) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editEvent, setEditEvent] = useState<HorseHistoryEvent | null>(null);

  const handleSaved = () => {
    setShowAdd(false);
    setShowImport(false);
    setEditEvent(null);
    router.refresh();
  };

  // Stats
  const byCategory: Record<string, number> = {};
  for (const ev of events) {
    byCategory[ev.category] = (byCategory[ev.category] || 0) + 1;
  }
  const chronic = events.filter((e) => e.outcome === "chronique").length;

  return (
    <div className="space-y-4">
      {/* Fiche d'identité */}
      <HorseIdentiteCard horseId={horseId} horseName={horseName} identite={horseIdentite} />

      {/* Header stats */}
      {events.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card">
            <span className="text-2xl font-black text-black">{events.length}</span>
            <span className="section-title mt-1">Événements</span>
          </div>
          <div className="stat-card">
            <span className="text-2xl font-black text-black">{Object.keys(byCategory).length}</span>
            <span className="section-title mt-1">Catégories</span>
          </div>
          <div className={`stat-card ${chronic > 0 ? "bg-orange-light border-orange/20" : ""}`}>
            <span className={`text-2xl font-black ${chronic > 0 ? "text-orange" : "text-black"}`}>{chronic}</span>
            <span className="section-title mt-1">Chroniques</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-black">Antécédents médicaux</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 text-xs font-bold border border-gray-200 text-gray-700 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <FileUp className="h-3.5 w-3.5" />
            Import IA
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-xs font-bold bg-black text-white px-3 py-2 rounded-xl hover:bg-gray-800 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Timeline */}
      <HistoriqueTimeline
        events={events}
        onEdit={(ev) => setEditEvent(ev)}
      />

      {/* Modals */}
      {(showAdd || editEvent) && (
        <HistoriqueEventModal
          open={showAdd || !!editEvent}
          horseId={horseId}
          event={editEvent}
          onClose={() => { setShowAdd(false); setEditEvent(null); }}
          onSaved={handleSaved}
        />
      )}

      {showImport && (
        <DocumentExtractModal
          open={showImport}
          horseId={horseId}
          onClose={() => setShowImport(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
