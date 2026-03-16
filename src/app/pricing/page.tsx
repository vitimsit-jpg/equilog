import { createClient } from "@/lib/supabase/server";
import PricingCards from "@/components/pricing/PricingCards";
import Link from "next/link";
import type { Plan } from "@/lib/plans";

export default async function PricingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let currentPlan: Plan = "starter";
  if (user) {
    const { data } = await supabase
      .from("users")
      .select("plan")
      .eq("id", user.id)
      .single();
    currentPlan = (data?.plan as Plan) || "starter";
  }

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #FAFAFA 0%, #FFF0EB 50%, #F5F5F5 100%)" }}>
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
            <span className="font-black text-xl text-black">Equilog</span>
          </Link>
          {user ? (
            <Link href="/dashboard" className="text-sm font-semibold text-gray-500 hover:text-black transition-colors">
              ← Retour au dashboard
            </Link>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm font-semibold text-gray-500 hover:text-black transition-colors">
                Connexion
              </Link>
              <Link href="/register" className="btn-primary text-sm">
                Créer un compte
              </Link>
            </div>
          )}
        </div>

        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-black mb-3">
            Choisissez votre plan
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Commencez gratuitement, évoluez selon vos besoins.
          </p>
        </div>

        <PricingCards isLoggedIn={!!user} currentPlan={currentPlan} />

        {/* Footer reassurance */}
        <div className="text-center mt-10 space-y-2">
          <p className="text-xs text-gray-400">
            Paiement sécurisé par Stripe · Résiliable à tout moment · Sans engagement
          </p>
          <Link href="/mentions-legales" className="text-xs text-gray-400 hover:text-gray-600 underline">
            Mentions légales & CGV
          </Link>
        </div>
      </div>
    </div>
  );
}
