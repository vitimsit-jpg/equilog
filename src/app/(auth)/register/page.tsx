"use client";

export const dynamic = "force-dynamic";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { CheckCircle2, Circle } from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan") as "pro" | "ecurie" | null;

  // Step 1: form fields
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2: consent
  const [consentTerms, setConsentTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleStepOne = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Le mot de passe doit faire au moins 8 caractères");
      return;
    }
    setStep(2);
  };

  const handleRegister = async () => {
    if (!consentTerms) return;
    setLoading(true);
    const supabase = createClient();

    // Create user server-side (auto-confirmed, no email verification needed)
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error || "Erreur lors de la création du compte");
      setStep(1);
      setLoading(false);
      return;
    }

    // Sign in immediately — no email confirmation required
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      toast.error("Compte créé mais connexion échouée. Essayez de vous connecter.");
      setLoading(false);
      return;
    }

    fetch("/api/send-welcome", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, name }) });
    toast.success("Compte créé ! Bienvenue sur Equistra.");

    if (planParam) {
      const checkoutRes = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planParam }),
      });
      const { url } = await checkoutRes.json();
      if (url) { window.location.href = url; return; }
    }

    router.push("/onboarding");
    router.refresh();
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #FAFAFA 0%, #FFF0EB 50%, #F5F5F5 100%)" }}>
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-black flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-lg">E</span>
            </div>
            <span className="font-black text-black text-2xl tracking-tight">EQUISTRA</span>
          </div>
          <p className="text-sm text-gray-500 font-medium">Le carnet de bord de votre cheval</p>
        </div>

        {step === 1 ? (
          <div className="card shadow-card-hover">
            <h1 className="text-xl font-bold text-black mb-1">Créer un compte</h1>
            <p className="text-sm text-gray-400 mb-6">Rejoignez la communauté équestre.</p>

            <form onSubmit={handleStepOne} className="space-y-4">
              <Input
                label="Prénom / Nom"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Marie Dupont"
                required
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@email.com"
                required
              />
              <Input
                label="Mot de passe"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères minimum"
                required
                minLength={8}
              />

              <Button type="submit" className="w-full">
                Continuer
              </Button>
            </form>

            <p className="text-center text-sm text-gray-400 mt-5">
              Déjà un compte ?{" "}
              <Link href="/login" className="text-orange font-semibold hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        ) : (
          <div className="card shadow-card-hover space-y-5">
            <div>
              <h1 className="text-xl font-bold text-black mb-1">Avant de commencer 🐴</h1>
              <p className="text-sm text-gray-400">Quelques points importants avant de créer votre compte.</p>
            </div>

            <div className="bg-beige rounded-xl p-4 space-y-3 text-sm text-gray-700">
              <div>
                <p className="font-semibold text-black mb-1">Vos données vous appartiennent</p>
                <p className="text-xs text-gray-500 leading-relaxed">Equistra collecte uniquement les données nécessaires au fonctionnement de l&apos;application. Vous pouvez exporter ou supprimer votre compte à tout moment depuis votre profil.</p>
              </div>
              <div>
                <p className="font-semibold text-black mb-1">Statistiques anonymisées</p>
                <p className="text-xs text-gray-500 leading-relaxed">Vos données contribuent à des statistiques anonymisées (Horse Index, tendances par discipline). Vous pourrez désactiver cela dans les paramètres.</p>
              </div>
              <div>
                <p className="font-semibold text-black mb-1">Contact & données personnelles</p>
                <p className="text-xs text-gray-500 leading-relaxed">Pour toute question sur vos données : <span className="font-medium text-black">privacy@equistra.com</span>. Nous répondons sous 30 jours (Art. 12 RGPD).</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setConsentTerms(!consentTerms)}
              className="w-full flex items-start gap-3 text-left"
            >
              {consentTerms
                ? <CheckCircle2 className="h-5 w-5 text-orange flex-shrink-0 mt-0.5" />
                : <Circle className="h-5 w-5 text-gray-300 flex-shrink-0 mt-0.5" />
              }
              <span className="text-sm text-gray-600 leading-relaxed">
                J&apos;accepte les{" "}
                <Link href="/cgu" target="_blank" className="text-orange font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                  Conditions Générales d&apos;Utilisation
                </Link>{" "}
                et la{" "}
                <Link href="/confidentialite" target="_blank" className="text-orange font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                  Politique de confidentialité
                </Link>{" "}
                d&apos;Equistra.
              </span>
            </button>

            <Button
              type="button"
              loading={loading}
              disabled={!consentTerms}
              onClick={handleRegister}
              className="w-full"
            >
              Créer mon compte
            </Button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-xs text-gray-400 hover:text-black transition-colors py-1"
            >
              ← Retour
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
