"use client";

/**
 * TRAV P2 — Bouton "Je commence à monter"
 * CTA pour les chevaux ICr : enregistre la première monte (jalon premiere_monte)
 * et propose de changer le mode de vie.
 * Utilisé sur la fiche cheval (profil) et dans l'EducationTab.
 */

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { format } from "date-fns";
import TransitionWizard from "@/components/horse/TransitionWizard";

interface Props {
  horseId: string;
  horseName?: string;
}

export default function FirstRideButton({ horseId, horseName }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [done, setDone] = useState(false);          // premiere_monte déjà validée
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [celebrated, setCelebrated] = useState(false); // post-save celebration
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    async function check() {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data } = await supabase
        .from("horse_growth_milestones")
        .select("id")
        .eq("horse_id", horseId)
        .eq("milestone_type", "premiere_monte")
        .lte("date", today)
        .limit(1);
      setDone((data ?? []).length > 0);
      setLoading(false);
    }
    check();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horseId]);

  const handleFirstRide = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const today = format(new Date(), "yyyy-MM-dd");
    const { error } = await supabase.from("horse_growth_milestones").insert({
      horse_id: horseId,
      user_id: user.id,
      milestone_type: "premiere_monte",
      label: "Première monte",
      date: today,
      notes: "Enregistrée depuis le bouton « Je commence à monter »",
    });

    if (error) {
      toast.error("Erreur lors de l'enregistrement");
      setSaving(false);
      return;
    }

    setSaving(false);
    setDone(true);
    setCelebrated(true);
    router.refresh();
  };

  if (loading || done) return null;

  if (celebrated) {
    return (
      <div className="card bg-green-50 border-green-200 text-center space-y-3 py-5">
        <span className="text-3xl">🎉</span>
        <div>
          <p className="text-sm font-bold text-green-800">Première monte enregistrée !</p>
          <p className="text-xs text-green-600 mt-1 leading-relaxed">
            Cette étape clé est maintenant dans le journal de {horseName ?? "votre cheval"}.
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="text-xs font-bold text-green-700 underline hover:text-green-900 transition-colors"
        >
          Changer le mode de vie → IE ou IC ?
        </button>

        {showWizard && (
          <TransitionWizard
            open={showWizard}
            onClose={() => setShowWizard(false)}
            horseId={horseId}
            horseName={horseName ?? ""}
            currentMode="ICr"
          />
        )}
      </div>
    );
  }

  return (
    <div className="card border-2 border-dashed border-green-200 bg-green-50/50 space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">🐴</span>
        <div>
          <p className="text-sm font-bold text-gray-800">Je commence à monter</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            Marquez la première monte de {horseName ?? "ce cheval"} — une étape clé de son éducation.
            Elle sera enregistrée dans la timeline des jalons.
          </p>
        </div>
      </div>
      <button
        onClick={handleFirstRide}
        disabled={saving}
        className="w-full btn-primary text-sm py-3 flex items-center justify-center gap-2 disabled:opacity-40"
      >
        {saving ? "Enregistrement…" : "🐴 Enregistrer la première monte"}
      </button>
    </div>
  );
}
