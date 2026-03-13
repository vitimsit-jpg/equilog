"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import type { User, UserType } from "@/lib/supabase/types";
import Badge from "@/components/ui/Badge";
import { Bell } from "lucide-react";

interface Props {
  user: User | null;
}

const planLabels = {
  starter: "Starter",
  pro: "Pro",
  ecurie: "Écurie",
};

const USER_TYPE_OPTIONS: { type: UserType; emoji: string; label: string; subtitle: string }[] = [
  { type: "loisir", emoji: "🌿", label: "Cavalier loisir", subtitle: "Je monte pour le plaisir" },
  { type: "competition", emoji: "🏆", label: "Compétiteur amateur", subtitle: "Je concours régulièrement" },
  { type: "pro", emoji: "⭐", label: "Cavalier professionnel", subtitle: "Haut niveau / semi-pro" },
  { type: "gerant_cavalier", emoji: "🏠", label: "Gérant d'écurie + cavalier", subtitle: "Double casquette" },
  { type: "coach", emoji: "🎯", label: "Coach indépendant", subtitle: "J'entraîne des cavaliers" },
  { type: "gerant_ecurie", emoji: "🏢", label: "Gérant d'écurie", subtitle: "Gestion pure de structure" },
];

export default function SettingsForm({ user }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [userType, setUserType] = useState<UserType | null>(user?.user_type || null);
  const [savingType, setSavingType] = useState(false);
  const [notifHealth, setNotifHealth] = useState(user?.notify_health_reminders ?? true);
  const [notifWeekly, setNotifWeekly] = useState(user?.notify_weekly_summary ?? true);
  const [savingNotif, setSavingNotif] = useState(false);

  const handleNotifToggle = async (field: "notify_health_reminders" | "notify_weekly_summary", value: boolean) => {
    if (field === "notify_health_reminders") setNotifHealth(value);
    else setNotifWeekly(value);
    setSavingNotif(true);
    const { error } = await supabase.from("users").update({ [field]: value }).eq("id", user!.id);
    if (error) toast.error("Erreur lors de la sauvegarde");
    setSavingNotif(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("users").update({ name }).eq("id", user!.id);
    if (error) toast.error("Erreur lors de la sauvegarde");
    else { toast.success("Profil mis à jour"); router.refresh(); }
    setLoading(false);
  };

  const handleTypeChange = async (type: UserType) => {
    setUserType(type);
    setSavingType(true);
    const { error } = await supabase.from("users").update({ user_type: type }).eq("id", user!.id);
    if (error) toast.error("Erreur lors de la sauvegarde");
    else { toast.success("Profil mis à jour"); router.refresh(); }
    setSavingType(false);
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
          <h2 className="font-bold text-black">Mon profil utilisateur</h2>
          {savingType && <span className="text-xs text-gray-400">Enregistrement...</span>}
        </div>

        {/* Current profile banner */}
        {userType && (() => {
          const current = USER_TYPE_OPTIONS.find((p) => p.type === userType);
          return current ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-light border border-orange/20 mb-4">
              <span className="text-2xl">{current.emoji}</span>
              <div>
                <p className="text-xs font-bold text-orange uppercase tracking-wide">Profil actuel</p>
                <p className="text-sm font-bold text-black">{current.label}</p>
                <p className="text-xs text-gray-500">{current.subtitle}</p>
              </div>
            </div>
          ) : null;
        })()}

        <p className="text-xs text-gray-400 mb-3">Cliquez sur un profil pour le modifier :</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {USER_TYPE_OPTIONS.map((p) => (
            <button
              key={p.type}
              onClick={() => handleTypeChange(p.type)}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                userType === p.type
                  ? "border-orange bg-orange-light"
                  : "border-gray-100 hover:border-gray-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{p.emoji}</span>
                <div>
                  <p className="text-sm font-bold text-black">{p.label}</p>
                  <p className="text-xs text-gray-400">{p.subtitle}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-black flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications email
          </h2>
          {savingNotif && <span className="text-xs text-gray-400">Enregistrement...</span>}
        </div>
        <div className="space-y-3">
          {[
            { field: "notify_health_reminders" as const, label: "Rappels de soins", desc: "Email J-7 avant chaque soin prévu", value: notifHealth },
            { field: "notify_weekly_summary" as const, label: "Résumé hebdomadaire", desc: "Bilan de la semaine chaque lundi matin", value: notifWeekly },
          ].map(({ field, label, desc, value }) => (
            <label key={field} className="flex items-center justify-between cursor-pointer py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-semibold text-black">{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
              <div
                onClick={() => handleNotifToggle(field, !value)}
                className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer ${value ? "bg-black" : "bg-gray-200"}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${value ? "translate-x-5" : "translate-x-1"}`} />
              </div>
            </label>
          ))}
        </div>
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
          ].map((p) => {
            const isCurrent = user?.plan === p.plan;
            return (
              <div
                key={p.plan}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isCurrent
                    ? "border-orange bg-orange-light"
                    : "border-gray-100"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-bold text-black">{p.label}</span>
                    <span className="ml-2 text-sm text-gray-500">{p.price}</span>
                  </div>
                  {isCurrent ? (
                    <Badge variant="orange">Actuel</Badge>
                  ) : (
                    <button
                      onClick={() => toast("Paiement en ligne bientôt disponible — contactez-nous à contact@equistra.fr", { icon: "ℹ️" })}
                      className="text-xs font-semibold text-orange hover:underline"
                    >
                      Choisir ce plan →
                    </button>
                  )}
                </div>
                <ul className="space-y-0.5">
                  {p.features.map((f) => (
                    <li key={f} className="text-xs text-gray-500 flex items-center gap-1.5">
                      <span className="text-success">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
