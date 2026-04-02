"use client";

import Link from "next/link";
import { ArrowRight, Clock, CheckCircle, Dumbbell, Heart, Trophy, CalendarDays } from "lucide-react";
import HorseAvatar from "@/components/ui/HorseAvatar";
import type { HorseShare } from "@/lib/supabase/types";

interface ReceivedShare extends HorseShare {
  horse: {
    id: string;
    name: string;
    breed: string | null;
    avatar_url: string | null;
    horse_index_mode: string | null;
  };
  owner: {
    name: string;
    email: string;
  };
}

const ROLE_LABELS: Record<string, string> = {
  gerant: "Gérant d'écurie",
  coach: "Coach",
};

export default function ReceivedSharesList({ initialShares }: { initialShares: ReceivedShare[] }) {
  if (initialShares.length === 0) {
    return (
      <div className="card text-center py-10">
        <p className="text-gray-400 text-sm">Aucun accès partagé reçu pour l&apos;instant.</p>
        <p className="text-gray-400 text-xs mt-1">Les propriétaires de chevaux peuvent vous inviter à accéder à leurs données.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {initialShares.map((share) => (
        <div key={share.id} className="card flex items-center gap-4">
          <HorseAvatar
            photoUrl={share.horse.avatar_url}
            name={share.horse.name}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-black">{share.horse.name}</span>
              <span className="text-2xs bg-beige text-gray-600 px-2 py-0.5 rounded-full">
                {ROLE_LABELS[share.role] || share.role}
              </span>
              {share.status === "pending" ? (
                <span className="flex items-center gap-1 text-2xs text-warning font-medium">
                  <Clock className="h-3 w-3" /> En attente
                </span>
              ) : (
                <span className="flex items-center gap-1 text-2xs text-success font-medium">
                  <CheckCircle className="h-3 w-3" /> Actif
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Partagé par <span className="font-medium text-gray-600">{share.owner.name}</span>
              {share.horse.breed && ` · ${share.horse.breed}`}
            </p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {share.can_see_training && <DataBadge icon={<Dumbbell className="h-3 w-3" />} label="Travail" />}
              {share.can_see_health && <DataBadge icon={<Heart className="h-3 w-3" />} label="Santé" />}
              {share.can_see_competitions && <DataBadge icon={<Trophy className="h-3 w-3" />} label="Concours" />}
              {share.can_see_planning && <DataBadge icon={<CalendarDays className="h-3 w-3" />} label="Planning" />}
            </div>
          </div>
          {share.status === "active" && (
            <Link
              href={`/horses/${share.horse.id}`}
              className="flex-shrink-0 flex items-center gap-1 text-sm font-medium text-orange hover:underline"
            >
              Voir <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}

function DataBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1 text-2xs bg-beige text-gray-600 px-1.5 py-0.5 rounded-full">
      {icon} {label}
    </span>
  );
}
