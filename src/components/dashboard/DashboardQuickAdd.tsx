"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import Modal from "@/components/ui/Modal";
import QuickTrainingModal from "@/components/training/QuickTrainingModal";
import { useRouter } from "next/navigation";

interface Horse {
  id: string;
  name: string;
  avatar_url?: string | null;
  horse_index_mode?: string | null;
}

interface Props {
  horses: Horse[];
}

export default function DashboardQuickAdd({ horses }: Props) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleClick = () => {
    if (horses.length === 0) return;
    if (horses.length === 1) {
      setSelectedHorse(horses[0]);
      setModalOpen(true);
    } else {
      setPickerOpen(true);
    }
  };

  const handlePickHorse = (horse: Horse) => {
    setSelectedHorse(horse);
    setPickerOpen(false);
    setModalOpen(true);
  };

  const handleClose = () => {
    setModalOpen(false);
    setSelectedHorse(null);
  };

  if (horses.length === 0) return null;

  return (
    <>
      <button
        onClick={handleClick}
        className="btn-primary flex-shrink-0"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Logger séance</span>
        <span className="sm:hidden">+</span>
      </button>

      {/* Horse picker — only shown for 2+ horses */}
      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Pour quel cheval ?">
        <div className="space-y-2">
          {horses.map((horse) => (
            <button
              key={horse.id}
              onClick={() => handlePickHorse(horse)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-gray-100 bg-gray-50 hover:border-orange hover:bg-orange-light transition-all text-left"
            >
              {horse.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={horse.avatar_url}
                  alt={horse.name}
                  className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-black text-base">{horse.name[0]}</span>
                </div>
              )}
              <span className="font-semibold text-black text-sm">{horse.name}</span>
            </button>
          ))}
        </div>
      </Modal>

      {/* Training modal */}
      {selectedHorse && (
        <QuickTrainingModal
          open={modalOpen}
          onClose={handleClose}
          horseId={selectedHorse.id}
          horseName={selectedHorse.name}
          horseMode={selectedHorse.horse_index_mode as any}
          onSaved={() => { handleClose(); router.refresh(); }}
        />
      )}
    </>
  );
}
