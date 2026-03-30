"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import QuickTrainingModal from "@/components/training/QuickTrainingModal";
import type { HorseIndexMode } from "@/lib/supabase/types";

interface Horse {
  id: string;
  name: string;
  avatar_url?: string | null;
  horse_index_mode?: HorseIndexMode | null;
}

interface Props {
  horse: Horse;
}

export default function ChevauxQuickAdd({ horse }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-orange hover:bg-orange-light transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Enregistrer
      </button>

      {open && (
        <QuickTrainingModal
          open={open}
          onClose={() => setOpen(false)}
          horseId={horse.id}
          horseName={horse.name}
          horseMode={horse.horse_index_mode ?? null}
          onSaved={() => { setOpen(false); router.refresh(); }}
        />
      )}
    </>
  );
}
