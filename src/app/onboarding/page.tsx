"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import type { UserType } from "@/lib/supabase/types";
import { Check, ArrowRight, ArrowLeft } from "lucide-react";

const PROFILES: { type: UserType; emoji: string; title: string; subtitle: string; description: string }[] = [
  { type: "loisir", emoji: "🌿", title: "Cavalier loisir", subtitle: "Je monte pour le plaisir", description: "1–2 chevaux, peu ou pas de compétition, je veux un outil simple pour suivre la santé et le travail." },
  { type: "competition", emoji: "🏆", title: "Compétiteur amateur", subtitle: "Je concours régulièrement", description: "Compétitions régulières, logique de progression et de saison sportive, je veux analyser mes résultats." },
  { type: "pro", emoji: "⭐", title: "Cavalier professionnel", subtitle: "Haut niveau / semi-pro", description: "Plusieurs chevaux, compétitions de haut niveau, équipe autour de moi, besoin d'une gestion avancée." },
  { type: "gerant_cavalier", emoji: "🏠", title: "Gérant d'écurie + cavalier", subtitle: "Je gère une écurie et je monte", description: "Double casquette : je gère les pensionnaires ET mes propres chevaux en compétition." },
  { type: "coach", emoji: "🎯", title: "Coach indépendant", subtitle: "J'entraîne des cavaliers", description: "Je suis de nombreux couples cavalier–cheval, j'ai besoin d'accéder aux données de mes élèves." },
  { type: "gerant_ecurie", emoji: "🏢", title: "Gérant d'écurie", subtitle: "Gestion pure de structure", description: "Je gère une écurie en pension, coordination des prestataires, communication propriétaires." },
];

const DISCIPLINES = ["CSO", "Dressage", "CCE", "Endurance", "Attelage", "Voltige", "TREC", "Hunter", "Équitation Western", "Autre"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedProfile, setSelectedProfile] = useState<UserType | null>("loisir");
  const [horseName, setHorseName] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [loading, setLoading] = useState(false);

  const handleProfileNext = () => {
    if (selectedProfile) setStep(2);
  };

  const handleFinish = async () => {
    if (!selectedProfile) return;
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Save profile
    const { error: profileError } = await supabase
      .from("users")
      .update({ user_type: selectedProfile })
      .eq("id", user.id);

    if (profileError) {
      toast.error("Erreur lors de la sauvegarde");
      setLoading(false);
      return;
    }

    // Create horse if name provided
    if (horseName.trim()) {
      await supabase.from("horses").insert({
        user_id: user.id,
        name: horseName.trim(),
        discipline: discipline || null,
      });
    }

    setStep(3);
    setLoading(false);
  };

  // Step 3 — welcome
  if (step === 3) {
    return (
      <div className="min-h-screen bg-beige flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-black text-white flex items-center justify-center mx-auto mb-6">
            <Check className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-black text-black mb-2">Bienvenue sur Equistra !</h1>
          <p className="text-sm text-gray-500 mb-2">
            Votre profil est configuré.
            {horseName.trim() && (
              <> <span className="font-semibold text-black">{horseName.trim()}</span> a été ajouté à votre écurie.</>
            )}
          </p>
          <p className="text-xs text-gray-400 mb-8">
            Commencez par renseigner les informations de votre cheval, enregistrez une séance ou calculez son Horse Index.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="btn-primary w-full justify-center"
          >
            Accéder à mon tableau de bord <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-beige flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center">
              <span className="text-white font-black text-lg">E</span>
            </div>
            <span className="font-black text-black text-2xl tracking-tight">EQUISTRA</span>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s ? "bg-black text-white" : step > s ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"
                }`}>
                  {step > s ? <Check className="h-3.5 w-3.5" /> : s}
                </div>
                {s < 2 && <div className={`w-10 h-0.5 ${step > s ? "bg-green-500" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1 — Profile */}
        {step === 1 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-black">Quel est votre profil ?</h1>
              <p className="text-sm text-gray-500 mt-1">Votre expérience sera adaptée à vos besoins.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {PROFILES.map((p) => (
                <button
                  key={p.type}
                  onClick={() => setSelectedProfile(p.type)}
                  className={`text-left p-4 rounded-2xl border-2 transition-all ${
                    selectedProfile === p.type ? "border-orange bg-orange-light" : "border-gray-200 bg-white hover:border-gray-300"
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
              onClick={handleProfileNext}
              disabled={!selectedProfile}
              className="btn-primary w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continuer <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Step 2 — First horse */}
        {step === 2 && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-black">Ajoutez votre premier cheval</h1>
              <p className="text-sm text-gray-500 mt-1">Vous pourrez en ajouter d&apos;autres plus tard.</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4 space-y-4">
              <div>
                <label className="label">Nom du cheval <span className="text-orange">*</span></label>
                <input
                  type="text"
                  value={horseName}
                  onChange={(e) => setHorseName(e.target.value)}
                  placeholder="Ex : Dynamite, Sultan, Roxane…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange mt-1"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Discipline <span className="text-gray-400 font-normal">(optionnel)</span></label>
                <select
                  value={discipline}
                  onChange={(e) => setDiscipline(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange mt-1 bg-white"
                >
                  <option value="">Sélectionner…</option>
                  {DISCIPLINES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-center text-xs text-gray-400 mb-4">Vous pouvez passer cette étape et ajouter votre cheval depuis le dashboard.</p>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="btn-ghost flex items-center gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" /> Retour
              </button>
              <button
                onClick={handleFinish}
                disabled={loading}
                className="btn-primary flex-1 justify-center disabled:opacity-40"
              >
                {loading ? "Enregistrement…" : horseName.trim() ? "Créer et commencer →" : "Passer cette étape →"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
