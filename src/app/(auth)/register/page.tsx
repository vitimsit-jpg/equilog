"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Le mot de passe doit faire au moins 8 caractères");
      return;
    }
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      // Insert user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("users").upsert({
          id: user.id,
          email,
          name,
          plan: "starter",
        });
      }
      toast.success("Compte créé ! Bienvenue sur Equistra.");
      router.push("/onboarding");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-beige flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center">
              <span className="text-white font-black text-lg">E</span>
            </div>
            <span className="font-black text-black text-2xl tracking-tight">EQUISTRA</span>
          </div>
          <p className="text-sm text-gray-500">Le Strava du cheval</p>
        </div>

        <div className="card">
          <h1 className="text-xl font-bold text-black mb-6">Créer un compte</h1>

          <form onSubmit={handleRegister} className="space-y-4">
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

            <Button type="submit" loading={loading} className="w-full">
              Créer mon compte
            </Button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-5">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-orange font-semibold hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
