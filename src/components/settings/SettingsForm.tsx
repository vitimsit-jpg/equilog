"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import type { User, ProfileType } from "@/lib/supabase/types";
import Badge from "@/components/ui/Badge";
import { Bell } from "lucide-react";
import PushNotificationToggle from "./PushNotificationToggle";
import ProfileChangeModal from "./ProfileChangeModal";

interface Props {
  user: User | null;
}

const planLabels = {
  starter: "Starter",
  pro: "Pro",
  ecurie: "Écurie",
};

const PROFILE_OPTIONS: { type: ProfileType; emoji: string; label: string; subtitle: string }[] = [
  { type: "loisir",      emoji: "🌿", label: "Cavalier loisir",   subtitle: "Je monte pour le plaisir" },
  { type: "competition", emoji: "🏆", label: "Compétiteur amateur", subtitle: "Je concours régulièrement" },
  { type: "pro",         emoji: "⭐", label: "Professionnel",     subtitle: "Haut niveau / semi-pro" },
  { type: "gerant",      emoji: "🏢", label: "Gérant d'écurie",   subtitle: "Gestion de structure équestre" },
];

export default function SettingsForm({ user }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const profileType = (user?.profile_type || null) as ProfileType | null;

  const [notifHealth, setNotifHealth] = useState(user?.notify_health_reminders ?? true);
  const [notifWeekly, setNotifWeekly] = useState(user?.notify_weekly_summary ?? true);
  const [savingNotif, setSavingNotif] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [upgrading, setUpgrading] = useState<"pro" | "ecurie" | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("success") === "1") {
      toast.success("Abonnement activé ! Bienvenue sur le plan Pro.");
    }
  }, [searchParams]);

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


  const handleUpgrade = async (plan: "pro" | "ecurie") => {
    setUpgrading(plan);
    const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
    const { url } = await res.json();
    if (url) window.location.href = url;
    setUpgrading(null);
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const { url } = await res.json();
    if (url) window.location.href = url;
    setPortalLoading(false);
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
        <h2 className="font-bold text-black mb-4">Mon profil utilisateur</h2>

        {profileType && (() => {
          const current = PROFILE_OPTIONS.find((p) => p.type === profileType);
          return current ? (
            <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-orange-light border border-orange/20">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{current.emoji}</span>
                <div>
                  <p className="text-xs font-bold text-orange uppercase tracking-wide">Profil actuel</p>
                  <p className="text-sm font-bold text-black">{current.label}</p>
                  <p className="text-xs text-gray-500">{current.subtitle}</p>
                  <div className="flex gap-1.5 mt-1">
                    {user?.module_coach && (
                      <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">🎯 Coach</span>
                    )}
                    {user?.module_gerant && (
                      <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">🏢 Gérant</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                className="text-xs font-semibold text-gray-400 hover:text-black underline whitespace-nowrap transition-colors"
              >
                Changer
              </button>
            </div>
          ) : null;
        })()}

        <p className="text-xs text-gray-400 mt-3">
          Le profil détermine la navigation, le contenu mis en avant et les recommandations de l&apos;IA.
          Ce n&apos;est pas un simple filtre — changez-le intentionnellement.
        </p>
      </div>

      {profileModalOpen && profileType && (
        <ProfileChangeModal
          userId={user!.id}
          currentProfile={profileType}
          currentModuleCoach={user?.module_coach ?? false}
          currentModuleGerant={user?.module_gerant ?? false}
          onClose={() => setProfileModalOpen(false)}
        />
      )}

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
        <div className="pt-3 border-t border-gray-50">
          <PushNotificationToggle />
        </div>
      </div>

      <div className="card">
        <h2 className="font-bold text-black mb-4">IA & Coaching</h2>
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-black">Insights IA hebdomadaires</p>
              <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Bientôt disponible</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Analyse automatique de l'activité, fatigue et progression chaque semaine</p>
          </div>
          <div className="relative w-10 h-6 rounded-full bg-gray-100 flex-shrink-0 cursor-not-allowed opacity-50">
            <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm" />
          </div>
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
            { plan: "starter" as const, label: "Starter", price: "Gratuit", features: ["1 cheval", "Carnet de santé", "Journal de travail"] },
            { plan: "pro" as const, label: "Pro", price: "9€/mois", features: ["Chevaux illimités", "Tous les modules", "IA illimitée", "Export PDF"] },
            { plan: "ecurie" as const, label: "Écurie", price: "29€/mois", features: ["Tout le plan Pro", "Gestion multi-cavaliers", "Dashboard écurie"] },
          ].map((p) => {
            const isCurrent = user?.plan === p.plan;
            const isStarter = p.plan === "starter";
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
                  ) : !isStarter ? (
                    <button
                      type="button"
                      onClick={() => handleUpgrade(p.plan)}
                      disabled={upgrading === p.plan}
                      className="text-xs font-semibold text-orange hover:underline disabled:opacity-50"
                    >
                      {upgrading === p.plan ? "Redirection..." : "Choisir ce plan →"}
                    </button>
                  ) : null}
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

        {user?.stripe_subscription_id && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handlePortal}
              disabled={portalLoading}
              className="text-sm font-semibold text-gray-600 hover:text-black underline disabled:opacity-50"
            >
              {portalLoading ? "Redirection..." : "Gérer mon abonnement →"}
            </button>
          </div>
        )}
      </div>

      <div className="text-center pt-2 flex items-center justify-center gap-3">
        <a href="/mentions-legales" className="text-xs text-gray-400 hover:text-gray-600 underline">
          Mentions légales
        </a>
        <span className="text-gray-200">·</span>
        <a href="/confidentialite" className="text-xs text-gray-400 hover:text-gray-600 underline">
          Politique de confidentialité
        </a>
        <span className="text-gray-200">·</span>
        <a href="/cgu" className="text-xs text-gray-400 hover:text-gray-600 underline">
          CGU
        </a>
      </div>
    </div>
  );
}
