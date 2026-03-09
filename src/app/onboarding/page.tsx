"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import type { UserType } from "@/lib/supabase/types";

const PROFILES: {
  type: UserType;
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
}[] = [
  {
    type: "loisir",
    emoji: "🌿",
    title: "Cavalier loisir",
    subtitle: "Je monte pour le plaisir",
    description: "1–2 chevaux, peu ou pas de compétition, je veux un outil simple pour suivre la santé et le travail.",
  },
  {
    type: "competition",
    emoji: "🏆",
    title: "Compétiteur amateur",
    subtitle: "Je concours régulièrement",
    description: "Compétitions régulières, logique de progression et de saison sportive, je veux analyser mes résultats.",
  },
  {
    type: "pro",
    emoji: "⭐",
    title: "Cavalier professionnel",
    subtitle: "Haut niveau / semi-pro",
    description: "Plusieurs chevaux, compétitions de haut niveau, équipe autour de moi, besoin d'une gestion avancée.",
  },
  {
    type: "gerant_cavalier",
    emoji: "🏠",
    title: "Gérant d'écurie + cavalier",
    subtitle: "Je gère une écurie et je monte",
    description: "Double casquette : je gère les pensionnaires ET mes propres chevaux en compétition.",
  },
  {
    type: "coach",
    emoji: "🎯",
    title: "Coach indépendant",
    subtitle: "J'entraîne des cavaliers",
    description: "Je suis de nombreux couples cavalier–cheval, j'ai besoin d'accéder aux données de mes élèves.",
  },
  {
    type: "gerant_ecurie",
    emoji: "🏢",
    title: "Gérant d'écurie",
    subtitle: "Gestion pure de structure",
    description: "Je gère une écurie en pension, coordination des prestataires, communication propriétaires.",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!selected) return;
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { error } = await supabase
      .from("users")
      .update({ user_type: selected })
      .eq("id", user.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-beige flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center">
              <span className="text-white font-black text-lg">E</span>
            </div>
            <span className="font-black text-black text-2xl tracking-tight">EQUILOG</span>
          </div>
          <h1 className="text-xl font-bold text-black mt-2">Quel est votre profil ?</h1>
          <p className="text-sm text-gray-500 mt-1">
            Votre expérience sera adaptée à vos besoins. Vous pouvez changer de profil à tout moment dans les paramètres.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {PROFILES.map((p) => (
            <button
              key={p.type}
              onClick={() => setSelected(p.type)}
              className={`text-left p-4 rounded-2xl border-2 transition-all ${
                selected === p.type
                  ? "border-orange bg-orange-light"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{p.emoji}</span>
                <div>
                  <p className="font-bold text-black text-sm">{p.title}</p>
                  <p className="text-xs text-orange font-medium mb-1">{p.subtitle}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{p.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleConfirm}
          disabled={!selected || loading}
          className="btn-primary w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Enregistrement..." : "Commencer avec Equilog →"}
        </button>
      </div>
    </div>
  );
}
