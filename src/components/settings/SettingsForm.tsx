"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import type { User } from "@/lib/supabase/types";
import Badge from "@/components/ui/Badge";

interface Props {
  user: User | null;
}

const planLabels = {
  starter: "Starter",
  pro: "Pro",
  ecurie: "Écurie",
};

export default function SettingsForm({ user }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user?.name || "");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("users").update({ name }).eq("id", user!.id);
    if (error) toast.error("Erreur lors de la sauvegarde");
    else { toast.success("Profil mis à jour"); router.refresh(); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="font-bold text-black mb-4">Mon profil</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nom complet"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Email"
            value={user?.email || ""}
            disabled
            hint="L'email ne peut pas être modifié"
          />
          <Button type="submit" loading={loading}>Sauvegarder</Button>
        </form>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-black">Mon abonnement</h2>
          <Badge variant={user?.plan === "pro" ? "orange" : "gray"}>
            {planLabels[user?.plan || "starter"]}
          </Badge>
        </div>
        <div className="space-y-3">
          {[
            { plan: "starter", label: "Starter", price: "Gratuit", features: ["1 cheval", "Carnet de santé", "Journal de travail"] },
            { plan: "pro", label: "Pro", price: "9€/mois", features: ["Chevaux illimités", "Tous les modules", "IA illimitée", "Export PDF"] },
            { plan: "ecurie", label: "Écurie", price: "29€/mois", features: ["Tout le plan Pro", "Gestion multi-cavaliers", "Dashboard écurie"] },
          ].map((p) => (
            <div
              key={p.plan}
              className={`p-4 rounded-xl border-2 transition-all ${
                user?.plan === p.plan
                  ? "border-orange bg-orange-light"
                  : "border-gray-100 hover:border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-bold text-black">{p.label}</span>
                  <span className="ml-2 text-sm text-gray-500">{p.price}</span>
                </div>
                {user?.plan === p.plan && <Badge variant="orange">Actuel</Badge>}
              </div>
              <ul className="space-y-0.5">
                {p.features.map((f) => (
                  <li key={f} className="text-xs text-gray-500 flex items-center gap-1.5">
                    <span className="text-success">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
