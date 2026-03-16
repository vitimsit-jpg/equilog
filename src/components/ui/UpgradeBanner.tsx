"use client";
import Link from "next/link";
import { Sparkles } from "lucide-react";

interface Props {
  feature: string;
  requiredPlan?: "pro" | "ecurie";
}

export default function UpgradeBanner({ feature, requiredPlan = "pro" }: Props) {
  const planLabel = requiredPlan === "ecurie" ? "Écurie" : "Pro";
  const price = requiredPlan === "ecurie" ? "29€" : "9€";
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-orange-light flex items-center justify-center mb-4">
        <Sparkles className="h-6 w-6 text-orange" />
      </div>
      <h3 className="font-black text-black text-lg mb-1">{feature} — Plan {planLabel}</h3>
      <p className="text-sm text-gray-400 mb-6 max-w-xs">
        Passez au plan {planLabel} ({price}/mois) pour accéder à cette fonctionnalité.
      </p>
      <Link href="/pricing" className="btn-primary inline-flex">
        Voir les plans →
      </Link>
    </div>
  );
}
