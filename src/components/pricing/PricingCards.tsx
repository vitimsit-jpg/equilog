"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import type { Plan } from "@/lib/plans";

const PLANS = [
  {
    id: "starter" as Plan,
    name: "Starter",
    price: "Gratuit",
    priceDetail: "pour toujours",
    features: [
      "1 cheval",
      "Carnet de santé",
      "Journal de travail",
      "Concours",
      "Budget",
    ],
    cta: "Commencer gratuitement",
    highlighted: false,
  },
  {
    id: "pro" as Plan,
    name: "Pro",
    price: "9,90€",
    priceDetail: "par mois",
    features: [
      "Chevaux illimités",
      "Tous les modules",
      "Horse Index + classements",
      "IA illimitée (Coach + Insights)",
      "Export PDF bilan annuel",
      "Profil public partageable",
    ],
    cta: "Choisir Pro",
    highlighted: true,
  },
  {
    id: "ecurie" as Plan,
    name: "Écurie",
    price: "29€",
    priceDetail: "par mois",
    features: [
      "Tout le plan Pro",
      "Gestion multi-cavaliers",
      "Dashboard gérant d'écurie",
      "Vue consolidée tous chevaux",
    ],
    cta: "Choisir Écurie",
    highlighted: false,
  },
];

interface Props {
  isLoggedIn: boolean;
  currentPlan: Plan;
}

export default function PricingCards({ isLoggedIn, currentPlan }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<Plan | null>(null);

  const handleSelect = async (plan: Plan) => {
    if (plan === "starter") {
      router.push(isLoggedIn ? "/dashboard" : "/register");
      return;
    }
    if (!isLoggedIn) {
      router.push(`/register?plan=${plan}`);
      return;
    }
    if (plan === currentPlan) {
      router.push("/settings");
      return;
    }
    setLoading(plan);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
    setLoading(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {PLANS.map((plan) => {
        const isCurrent = isLoggedIn && plan.id === currentPlan;
        const isHighlighted = plan.highlighted;

        return (
          <div
            key={plan.id}
            className={`relative rounded-2xl p-6 flex flex-col transition-all ${
              isHighlighted
                ? "bg-black text-white shadow-2xl scale-[1.03]"
                : "bg-white border-2 border-gray-100"
            }`}
          >
            {isHighlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-orange text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wide">
                  Recommandé
                </span>
              </div>
            )}

            <div className="mb-6">
              <h2 className={`font-black text-xl mb-1 ${isHighlighted ? "text-white" : "text-black"}`}>
                {plan.name}
              </h2>
              <div className="flex items-baseline gap-1">
                <span className={`text-3xl font-black ${isHighlighted ? "text-white" : "text-black"}`}>
                  {plan.price}
                </span>
                <span className={`text-sm ${isHighlighted ? "text-gray-400" : "text-gray-400"}`}>
                  {plan.priceDetail}
                </span>
              </div>
            </div>

            <ul className="space-y-2.5 flex-1 mb-8">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check
                    className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                      isHighlighted ? "text-orange" : "text-success"
                    }`}
                  />
                  <span className={isHighlighted ? "text-gray-300" : "text-gray-600"}>
                    {f}
                  </span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSelect(plan.id)}
              disabled={loading === plan.id || isCurrent}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-60 ${
                isCurrent
                  ? "border-2 border-gray-200 text-gray-400 cursor-default"
                  : isHighlighted
                  ? "bg-orange text-white hover:bg-orange/90"
                  : "border-2 border-black text-black hover:bg-black hover:text-white"
              }`}
            >
              {isCurrent
                ? "Plan actuel"
                : loading === plan.id
                ? "Redirection..."
                : plan.cta}
            </button>
          </div>
        );
      })}
    </div>
  );
}
