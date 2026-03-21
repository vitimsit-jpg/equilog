"use client";

import Link from "next/link";
import type { UserType, UserPlan } from "@/lib/supabase/types";

interface Props {
  userPlan: UserPlan;
  userType: UserType | null;
  context: "ai_insights" | "multi_horses" | "competitions" | "export" | "ecurie";
}

const NUDGE_CONFIG: Record<string, Record<string, { title: string; desc: string; cta: string }>> = {
  ai_insights: {
    loisir:          { title: "Coach IA illimité", desc: "Générez autant d'analyses que vous voulez pour garder votre cheval en forme.", cta: "Passer au Pro" },
    competition:     { title: "Coach IA Performance", desc: "Analyses illimitées avec focus progression et préparation concours.", cta: "Passer au Pro" },
    pro:             { title: "Coach IA Expert", desc: "Analyses avancées multi-chevaux avec benchmarks et alertes automatiques.", cta: "Passer au Pro" },
    gerant_cavalier: { title: "Analyses illimitées", desc: "Coach IA sans limite pour tous vos chevaux et ceux de votre écurie.", cta: "Passer à Écurie" },
    coach:           { title: "Suivi IA de vos élèves", desc: "Analyses hebdomadaires automatiques pour chacun de vos couples cavalier-cheval.", cta: "Passer au Pro" },
    gerant_ecurie:   { title: "Alertes santé automatiques", desc: "Recevez des alertes IA dès qu'un pensionnaire présente un signal anormal.", cta: "Passer à Écurie" },
  },
  multi_horses: {
    loisir:          { title: "Gérez plusieurs chevaux", desc: "Vous avez un 2ème cheval ? Passez au Pro pour un suivi illimité.", cta: "Passer au Pro" },
    competition:     { title: "Multi-chevaux illimité", desc: "Suivez toute votre cavalerie avec analyses croisées et Horse Index par cheval.", cta: "Passer au Pro" },
    pro:             { title: "Chevaux illimités", desc: "Gérez l'ensemble de votre cavalerie professionnelle sans limite.", cta: "Passer au Pro" },
    gerant_cavalier: { title: "Gestion multi-chevaux", desc: "Pensionnaires + chevaux perso, tout centralisé dans un seul tableau de bord.", cta: "Passer à Écurie" },
    coach:           { title: "Accès multi-élèves", desc: "Suivez tous vos couples cavalier-cheval sans limite.", cta: "Passer au Pro" },
    gerant_ecurie:   { title: "Écurie complète", desc: "Gérez jusqu'à 50 pensionnaires avec agenda, facturation et messagerie.", cta: "Passer à Écurie" },
  },
  export: {
    loisir:          { title: "Export PDF", desc: "Exportez le carnet de santé ou l'historique de travail de votre cheval.", cta: "Passer au Pro" },
    competition:     { title: "Export & rapports", desc: "Exportez vos résultats de saison et bilans de performance en PDF.", cta: "Passer au Pro" },
    pro:             { title: "Export professionnel", desc: "Rapports détaillés exportables pour vos partenaires et sponsors.", cta: "Passer au Pro" },
    gerant_cavalier: { title: "Export & facturation", desc: "Générez des rapports de suivi et des factures de pension automatiquement.", cta: "Passer à Écurie" },
    coach:           { title: "Rapports de progression", desc: "Exportez les bilans de progression de vos élèves en PDF.", cta: "Passer au Pro" },
    gerant_ecurie:   { title: "Facturation automatique", desc: "Générez et envoyez les factures de pension en un clic.", cta: "Passer à Écurie" },
  },
};

export default function PremiumNudge({ userPlan, userType, context }: Props) {
  if (userPlan !== "starter") return null;

  const profileKey = userType || "loisir";
  const nudge = NUDGE_CONFIG[context]?.[profileKey] || NUDGE_CONFIG[context]?.loisir;
  if (!nudge) return null;

  const targetPlan = nudge.cta.includes("Écurie") ? "Écurie" : "Pro";
  const priceLabel = targetPlan === "Écurie" ? "29€/mois" : "9€/mois";

  return (
    <div className="rounded-2xl bg-gradient-to-r from-orange-light to-white border border-orange/15 p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-orange/10 border border-orange/20 flex items-center justify-center flex-shrink-0">
          <span className="text-orange text-base">✨</span>
        </div>
        <div>
          <p className="text-sm font-bold text-black">{nudge.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{nudge.desc}</p>
        </div>
      </div>
      <Link
        href="/profil"
        className="shrink-0 text-xs font-bold text-white bg-orange rounded-xl px-3 py-1.5 shadow-orange hover:bg-orange-hover transition-all whitespace-nowrap"
      >
        {nudge.cta} · {priceLabel}
      </Link>
    </div>
  );
}
