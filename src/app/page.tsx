import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center">
            <span className="text-white font-black text-sm">E</span>
          </div>
          <span className="font-black text-black text-lg tracking-tight">EQUISTRA</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-semibold text-gray-600 hover:text-black transition-colors">
            Connexion
          </Link>
          <Link href="/register" className="text-sm font-bold px-4 py-2 rounded-xl bg-black text-white hover:bg-gray-800 transition-colors">
            Essayer gratuitement
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-light border border-orange/20 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-orange" />
            <span className="text-xs font-semibold text-orange">Horse Index · Suivi santé · Journal de travail</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-black leading-tight mb-4">
            Le carnet de bord<br />
            <span className="text-orange">de votre cheval</span>
          </h1>

          <p className="text-lg text-gray-500 mb-8 leading-relaxed">
            Suivez la santé, le travail et la progression de vos chevaux.<br />
            Horse Index, rappels de soins, analyse IA — tout en un.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="px-6 py-3.5 rounded-2xl bg-black text-white font-bold text-sm hover:bg-gray-800 transition-colors"
            >
              Créer un compte gratuit →
            </Link>
            <Link
              href="/login"
              className="px-6 py-3.5 rounded-2xl border border-gray-200 text-black font-semibold text-sm hover:border-gray-400 transition-colors"
            >
              Se connecter
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mt-16">
          {[
            { emoji: "🏆", title: "Horse Index", desc: "Score de forme calculé en temps réel sur 100 points" },
            { emoji: "🩺", title: "Carnet de santé", desc: "Rappels automatiques vaccin, parage, vermifuge" },
            { emoji: "🤖", title: "Analyse IA", desc: "Coach IA et insights hebdomadaires personnalisés" },
          ].map((f) => (
            <div key={f.title} className="p-5 rounded-2xl border border-gray-100 text-left">
              <div className="text-2xl mb-3">{f.emoji}</div>
              <p className="font-bold text-black text-sm mb-1">{f.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="text-center py-6 text-xs text-gray-300">
        © 2026 Equistra · <Link href="/mentions-legales" className="hover:text-gray-500">Mentions légales</Link> · <Link href="/confidentialite" className="hover:text-gray-500">Confidentialité</Link>
      </footer>
    </div>
  );
}
