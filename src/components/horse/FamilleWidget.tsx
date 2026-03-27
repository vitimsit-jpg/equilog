"use client";

/**
 * TRAV P2 — Widget mère / poulain
 * Affiché sur la fiche cheval quand mere_horse_id ou poulain_horse_id est renseigné.
 */

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { Link2, X } from "lucide-react";

interface LinkedHorse {
  id: string;
  name: string;
  breed: string | null;
  birth_year: number | null;
  avatar_url: string | null;
}

interface Props {
  horseId: string;
  mereHorseId: string | null;
  poulainHorseId: string | null;
}

export default function FamilleWidget({ horseId, mereHorseId, poulainHorseId }: Props) {
  const supabase = createClient();
  const [mere, setMere] = useState<LinkedHorse | null>(null);
  const [poulain, setPoulain] = useState<LinkedHorse | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlinking, setUnlinking] = useState<"mere" | "poulain" | null>(null);

  useEffect(() => {
    async function load() {
      const ids = [mereHorseId, poulainHorseId].filter(Boolean) as string[];
      if (ids.length === 0) { setLoading(false); return; }
      const { data } = await supabase
        .from("horses")
        .select("id, name, breed, birth_year, avatar_url")
        .in("id", ids);
      const horses = (data ?? []) as LinkedHorse[];
      if (mereHorseId) setMere(horses.find((h) => h.id === mereHorseId) ?? null);
      if (poulainHorseId) setPoulain(horses.find((h) => h.id === poulainHorseId) ?? null);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mereHorseId, poulainHorseId]);

  const unlink = async (field: "mere_horse_id" | "poulain_horse_id", role: "mere" | "poulain") => {
    setUnlinking(role);
    await supabase.from("horses").update({ [field]: null }).eq("id", horseId);
    if (role === "mere") setMere(null);
    else setPoulain(null);
    setUnlinking(null);
  };

  if (loading) return null;
  if (!mere && !poulain) return null;

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="h-3.5 w-3.5 text-gray-400" />
        <h2 className="font-bold text-black text-sm">Famille</h2>
      </div>

      <div className="space-y-2">
        {mere && (
          <HorseLink
            horse={mere}
            role="Mère"
            emoji="🐴"
            onUnlink={() => unlink("mere_horse_id", "mere")}
            unlinking={unlinking === "mere"}
          />
        )}
        {poulain && (
          <HorseLink
            horse={poulain}
            role="Poulain"
            emoji="🐣"
            onUnlink={() => unlink("poulain_horse_id", "poulain")}
            unlinking={unlinking === "poulain"}
          />
        )}
      </div>
    </div>
  );
}

function HorseLink({
  horse, role, emoji, onUnlink, unlinking,
}: {
  horse: LinkedHorse;
  role: string;
  emoji: string;
  onUnlink: () => void;
  unlinking: boolean;
}) {
  const age = horse.birth_year ? new Date().getFullYear() - horse.birth_year : null;
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-beige group">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
        {horse.avatar_url ? (
          <Image
            src={horse.avatar_url}
            alt={horse.name}
            width={36}
            height={36}
            className="object-cover w-full h-full"
          />
        ) : (
          <span className="text-lg">{emoji}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-2xs text-gray-400 font-semibold uppercase tracking-wide">{role}</span>
        </div>
        <Link
          href={`/horses/${horse.id}`}
          className="text-sm font-bold text-black hover:text-orange transition-colors truncate block"
        >
          {horse.name}
        </Link>
        {(horse.breed || age) && (
          <p className="text-2xs text-gray-400 mt-0.5 truncate">
            {[horse.breed, age ? `${age} ans` : null].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      {/* Unlink */}
      <button
        onClick={onUnlink}
        disabled={unlinking}
        title="Supprimer le lien"
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all disabled:opacity-40 flex-shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
