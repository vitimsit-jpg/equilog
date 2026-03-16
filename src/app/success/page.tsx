import Link from "next/link";
import { Check, Sparkles, FileDown, Users, Trophy, Heart } from "lucide-react";

const PRO_FEATURES = [
  { icon: Sparkles, label: "IA illimitée", desc: "Coach IA + insights hebdomadaires" },
  { icon: Trophy, label: "Horse Index", desc: "Score, classements, percentiles" },
  { icon: FileDown, label: "Export PDF", desc: "Bilan annuel complet" },
  { icon: Heart, label: "Chevaux illimités", desc: "Gérez tous vos chevaux" },
  { icon: Users, label: "Profil public", desc: "Partagez les stats de votre cheval" },
];

const NEXT_STEPS = [
  { step: "1", label: "Ajoutez votre cheval", desc: "Commencez par créer ou compléter le profil de votre cheval.", href: "/dashboard", cta: "Aller au dashboard" },
  { step: "2", label: "Consultez le Horse Index", desc: "Votre score sera calculé après quelques jours de données.", href: "/dashboard", cta: "Voir mon score" },
  { step: "3", label: "Exportez votre premier PDF", desc: "Disponible depuis la fiche de chaque cheval.", href: "/dashboard", cta: "Accéder à mes chevaux" },
];

export default function SuccessPage() {
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #FAFAFA 0%, #FFF0EB 50%, #F5F5F5 100%)" }}>
      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange mb-6 shadow-lg">
            <Check className="h-10 w-10 text-white" strokeWidth={3} />
          </div>
          <h1 className="text-3xl font-black text-black mb-2">
            Bienvenue sur le plan Pro !
          </h1>
          <p className="text-gray-500 text-base">
            Votre abonnement est actif. Toutes les fonctionnalités Pro sont maintenant débloquées.
          </p>
        </div>

        {/* Features unlocked */}
        <div className="card mb-6">
          <h2 className="font-bold text-black mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-orange" />
            Fonctionnalités débloquées
          </h2>
          <div className="space-y-3">
            {PRO_FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-light flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-orange" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-black">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
                <Check className="h-4 w-4 text-success ml-auto flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Next steps */}
        <div className="card mb-8">
          <h2 className="font-bold text-black mb-4">Prochaines étapes</h2>
          <div className="space-y-4">
            {NEXT_STEPS.map(({ step, label, desc, href, cta }) => (
              <div key={step} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-black text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  {step}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-black">{label}</p>
                  <p className="text-xs text-gray-400 mb-2">{desc}</p>
                  <Link href={href} className="text-xs font-semibold text-orange hover:underline">
                    {cta} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-3">
          <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2 px-8 py-3 text-base">
            Accéder à mon dashboard →
          </Link>
          <p className="text-xs text-gray-400">
            Une question ?{" "}
            <a href="mailto:support@equilog.fr" className="underline hover:text-gray-600">
              Contactez-nous
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}
