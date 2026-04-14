"use client";

import dynamic from "next/dynamic";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { TrendingUp } from "lucide-react";
import type { BaladeTrack, TrainingSession } from "@/lib/supabase/types";

const BaladeMap = dynamic(() => import("./BaladeMap"), { ssr: false });

const FEELING_EMOJIS: Record<number, string> = { 1: "🤕", 2: "😕", 3: "😐", 4: "🙂", 5: "😄" };

interface BaladeWithSession {
  track: BaladeTrack;
  session: TrainingSession;
}

interface Props {
  balades: BaladeWithSession[];
}

export default function BaladeHistory({ balades }: Props) {
  if (balades.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-400">Aucune balade enregistrée</p>
        <p className="text-xs text-gray-300 mt-1">Vos balades GPS apparaîtront ici</p>
      </div>
    );
  }

  // Stats globales
  const totalKm = balades.reduce((sum, b) => sum + (Number(b.track.distance_km) || 0), 0);
  const totalMin = balades.reduce((sum, b) => sum + (b.session.duration_min || 0), 0);
  const totalHours = Math.floor(totalMin / 60);
  const remainingMin = totalMin % 60;

  return (
    <div className="space-y-4">
      {/* Stats globales */}
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card text-center">
          <p className="text-lg font-black text-black">{balades.length}</p>
          <p className="text-2xs text-gray-400">balade{balades.length > 1 ? "s" : ""}</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-lg font-black text-black">{totalKm.toFixed(1)} km</p>
          <p className="text-2xs text-gray-400">total</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-lg font-black text-black">
            {totalHours > 0 ? `${totalHours}h${remainingMin > 0 ? remainingMin : ""}` : `${totalMin}min`}
          </p>
          <p className="text-2xs text-gray-400">en selle</p>
        </div>
      </div>

      {/* Liste des balades */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
          Dernières balades
        </p>
        <div className="space-y-3">
          {balades.map((b) => {
            const coords = (b.track.coordinates || []) as { lat: number; lng: number }[];
            const dateLabel = format(parseISO(b.session.date), "EEEE d MMMM yyyy", { locale: fr });
            const distKm = Number(b.track.distance_km) || 0;
            const avgSpeed = Number(b.track.avg_speed_kmh) || 0;
            const elevation = Number(b.track.elevation_gain_m) || 0;

            return (
              <div key={b.track.id} className="card space-y-3">
                {/* Mini-carte */}
                {coords.length >= 2 && (
                  <div className="rounded-xl overflow-hidden border border-gray-100" style={{ height: "150px" }}>
                    <BaladeMap coordinates={coords} interactive={false} height="150px" />
                  </div>
                )}

                {/* Infos */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-black capitalize">{dateLabel}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="font-semibold text-black">{distKm.toFixed(1)} km</span>
                      <span>{b.session.duration_min}min</span>
                      {avgSpeed > 0 && <span>{avgSpeed.toFixed(1)} km/h</span>}
                      {elevation > 0 && (
                        <span className="flex items-center gap-0.5">
                          <TrendingUp className="h-3 w-3" />
                          {elevation.toFixed(0)}m
                        </span>
                      )}
                    </div>
                    {b.session.notes && (
                      <p className="text-2xs text-gray-400 mt-1 truncate max-w-xs">{b.session.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {b.session.feeling && (
                      <span className="text-lg">{FEELING_EMOJIS[b.session.feeling] ?? ""}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
