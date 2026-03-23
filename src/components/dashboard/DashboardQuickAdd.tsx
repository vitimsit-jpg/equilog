"use client";

import { useState } from "react";
import { Plus, Dumbbell, Heart, X, User } from "lucide-react";
import Modal from "@/components/ui/Modal";
import QuickTrainingModal from "@/components/training/QuickTrainingModal";
import QuickHealthModal from "@/components/health/QuickHealthModal";
import RiderLogModal from "@/components/rider/RiderLogModal";
import { useRouter } from "next/navigation";

interface Horse {
  id: string;
  name: string;
  avatar_url?: string | null;
  horse_index_mode?: string | null;
}

interface Props {
  horses: Horse[];
  userId: string;
  riderLog?: { forme: string | null; douleurs: string[] | null; douleur_intensite: string | null } | null;
}

type ActionType = "training" | "health";

export default function DashboardQuickAdd({ horses, userId, riderLog }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null);
  const [action, setAction] = useState<ActionType | null>(null);
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [riderLogOpen, setRiderLogOpen] = useState(false);

  const handleAction = (type: ActionType) => {
    setMenuOpen(false);
    setAction(type);
    if (horses.length === 1) {
      setSelectedHorse(horses[0]);
      if (type === "training") setTrainingOpen(true);
      else setHealthOpen(true);
    } else {
      setPickerOpen(true);
    }
  };

  const handlePickHorse = (horse: Horse) => {
    setSelectedHorse(horse);
    setPickerOpen(false);
    if (action === "training") setTrainingOpen(true);
    else setHealthOpen(true);
  };

  const handleClose = () => {
    setTrainingOpen(false);
    setHealthOpen(false);
    setSelectedHorse(null);
    setAction(null);
  };

  if (horses.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setMenuOpen(true)}
        className="w-9 h-9 rounded-xl bg-orange flex items-center justify-center shadow-sm hover:bg-orange/90 transition-colors flex-shrink-0"
      >
        <Plus className="h-5 w-5 text-white" />
      </button>

      {/* Menu bottom sheet */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 animate-fade-in">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl animate-slide-up" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="flex items-center justify-between px-5 pt-2 pb-4">
              <span className="font-bold text-black text-base">Ajouter</span>
              <button onClick={() => setMenuOpen(false)} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <div className="px-4 pb-2 space-y-3">
              <button
                onClick={() => handleAction("training")}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-orange-light border-2 border-orange/20 hover:border-orange transition-all text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-orange flex items-center justify-center flex-shrink-0">
                  <Dumbbell className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-black text-sm">Logger une séance</p>
                  <p className="text-xs text-gray-500 mt-0.5">Enregistrer un entraînement</p>
                </div>
              </button>
              <button
                onClick={() => handleAction("health")}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border-2 border-gray-100 hover:border-gray-300 transition-all text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <Heart className="h-6 w-6 text-gray-500" />
                </div>
                <div>
                  <p className="font-bold text-black text-sm">Logger un soin</p>
                  <p className="text-xs text-gray-500 mt-0.5">Vaccin, vétérinaire, ferrage…</p>
                </div>
              </button>
              <button onClick={() => { setMenuOpen(false); setRiderLogOpen(true); }} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-blue-50 border-2 border-blue-100 hover:border-blue-300 transition-all text-left">
                <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-black text-sm">Logger mon état</p>
                  <p className="text-xs text-gray-500 mt-0.5">Forme, fatigue, douleurs...</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Horse picker */}
      {pickerOpen && (
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
                  <img src={horse.avatar_url} alt={horse.name} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
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
      )}

      {/* Training modal */}
      {selectedHorse && trainingOpen && (
        <QuickTrainingModal
          open={trainingOpen}
          onClose={handleClose}
          horseId={selectedHorse.id}
          horseName={selectedHorse.name}
          horseMode={selectedHorse.horse_index_mode as any}
          onSaved={() => { handleClose(); router.refresh(); }}
          riderLog={riderLog ?? null}
        />
      )}

      {/* Health modal */}
      {selectedHorse && healthOpen && (
        <QuickHealthModal
          open={healthOpen}
          onClose={handleClose}
          horseId={selectedHorse.id}
          onSaved={() => { handleClose(); router.refresh(); }}
        />
      )}

      {/* Rider log modal */}
      <RiderLogModal
        open={riderLogOpen}
        onClose={() => setRiderLogOpen(false)}
        onSaved={() => { setRiderLogOpen(false); router.refresh(); }}
        userId={userId}
      />
    </>
  );
}
