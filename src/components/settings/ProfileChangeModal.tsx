"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { UserType } from "@/lib/supabase/types";
import { X, AlertTriangle, ArrowRight, Check, ShieldCheck } from "lucide-react";

const PROFILES: { type: UserType; emoji: string; label: string; subtitle: string }[] = [
  { type: "loisir",          emoji: "🌿", label: "Cavalier loisir",          subtitle: "Je monte pour le plaisir" },
  { type: "competition",     emoji: "🏆", label: "Compétiteur amateur",       subtitle: "Je concours régulièrement" },
  { type: "pro",             emoji: "⭐", label: "Cavalier professionnel",    subtitle: "Haut niveau / semi-pro" },
  { type: "gerant_cavalier", emoji: "🏠", label: "Gérant d'écurie + cavalier", subtitle: "Double casquette" },
  { type: "coach",           emoji: "🎯", label: "Coach indépendant",         subtitle: "J'entraîne des cavaliers" },
  { type: "gerant_ecurie",   emoji: "🏢", label: "Gérant d'écurie",           subtitle: "Gestion pure de structure" },
];

const CONSEQUENCES = [
  "La navigation est réorganisée selon les priorités de votre nouveau profil",
  "Les recommandations de l'IA sont recalibrées pour correspondre à vos nouveaux objectifs",
  "Le contenu mis en avant (concours, budget, soins) est réadapté",
  "Vos données existantes sont intégralement conservées",
];

interface Props {
  userId: string;
  currentType: UserType;
  onClose: () => void;
}

export default function ProfileChangeModal({ userId, currentType, onClose }: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<UserType | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentProfile = PROFILES.find((p) => p.type === currentType)!;
  const selectedProfile = PROFILES.find((p) => p.type === selected);

  const handleConfirm = async () => {
    if (!selected || !confirmed) return;
    setLoading(true);
    const { error } = await supabase.from("users").update({ user_type: selected }).eq("id", userId);
    if (error) {
      toast.error("Erreur lors du changement de profil");
      setLoading(false);
      return;
    }
    toast.success("Profil mis à jour — votre expérience a été reconfigurée.");
    onClose();
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="font-black text-black text-lg">Changer de profil</h2>
            <p className="text-xs text-gray-400 mt-0.5">Action structurante — lisez attentivement</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-black transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Step 1 : Conséquences ── */}
        {step === 1 && (
          <div className="px-6 py-5 space-y-5">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">Votre profil structure votre expérience</p>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  Ce n&apos;est pas un simple filtre. Changer de profil modifie en profondeur la façon dont Equistra est organisé pour vous.
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Ce qui va changer</p>
              <ul className="space-y-2.5">
                {CONSEQUENCES.map((c, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${i === CONSEQUENCES.length - 1 ? "bg-green-100" : "bg-gray-100"}`}>
                      {i === CONSEQUENCES.length - 1
                        ? <Check className="h-2.5 w-2.5 text-green-600" />
                        : <ArrowRight className="h-2.5 w-2.5 text-gray-500" />
                      }
                    </div>
                    <span className={i === CONSEQUENCES.length - 1 ? "text-green-700 font-medium" : ""}>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-2xl">{currentProfile.emoji}</span>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Profil actuel</p>
                <p className="text-sm font-bold text-black">{currentProfile.label}</p>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="btn-primary w-full justify-center"
            >
              Je comprends, choisir un nouveau profil <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="w-full text-center text-sm text-gray-400 hover:text-black py-1">
              Annuler
            </button>
          </div>
        )}

        {/* ── Step 2 : Sélection + confirmation ── */}
        {step === 2 && (
          <div className="px-6 py-5 space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Choisir votre nouveau profil</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PROFILES.map((p) => {
                  const isCurrent = p.type === currentType;
                  const isSelected = selected === p.type;
                  return (
                    <button
                      key={p.type}
                      disabled={isCurrent}
                      onClick={() => setSelected(p.type)}
                      className={`text-left p-3 rounded-xl border-2 transition-all ${
                        isCurrent
                          ? "border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed"
                          : isSelected
                          ? "border-black bg-black text-white"
                          : "border-gray-100 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{p.emoji}</span>
                        <div>
                          <p className={`text-sm font-bold ${isSelected ? "text-white" : "text-black"}`}>{p.label}</p>
                          <p className={`text-xs ${isSelected ? "text-gray-300" : "text-gray-400"}`}>{p.subtitle}</p>
                        </div>
                        {isCurrent && (
                          <span className="ml-auto text-xs text-gray-400 font-medium">actuel</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {selected && (
              <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 cursor-pointer transition-all">
                <div
                  onClick={() => setConfirmed(!confirmed)}
                  className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-all ${
                    confirmed ? "bg-black border-black" : "border-gray-300"
                  }`}
                >
                  {confirmed && <Check className="h-3 w-3 text-white" />}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Je comprends que passer au profil{" "}
                  <span className="font-bold text-black">{selectedProfile?.label}</span>{" "}
                  va modifier mon expérience sur Equistra. Mes données existantes sont conservées.
                </p>
              </label>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-ghost">
                Retour
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selected || !confirmed || loading}
                className="btn-primary flex-1 justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  "Reconfiguration en cours…"
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Confirmer le changement
                  </>
                )}
              </button>
            </div>
            <button onClick={onClose} className="w-full text-center text-sm text-gray-400 hover:text-black py-1">
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
