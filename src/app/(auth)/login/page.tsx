"use client";

export const dynamic = "force-dynamic";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

function DeletedBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get("deleted") !== "1") return null;
  return (
    <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 text-center">
      Votre compte a bien été supprimé. À bientôt 👋
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #FAFAFA 0%, #FFF0EB 50%, #F5F5F5 100%)" }}>
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-black flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-lg">E</span>
            </div>
            <span className="font-black text-black text-2xl tracking-tight">EQUISTRA</span>
          </div>
          <p className="text-sm text-gray-500 font-medium">Le carnet de bord de votre cheval</p>
        </div>

        <Suspense>
          <DeletedBanner />
        </Suspense>

        <div className="card shadow-card-hover">
          <h1 className="text-xl font-bold text-black mb-1">Bon retour</h1>
          <p className="text-sm text-gray-600 mb-6">Connectez-vous à votre espace.</p>

          <form onSubmit={handleLogin} className="space-y-4">
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
              placeholder="••••••••"
              required
            />

            <Button type="submit" loading={loading} className="w-full mt-1">
              Se connecter
            </Button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-5">
            Pas encore de compte ?{" "}
            <Link href="/register" className="text-orange font-semibold hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
