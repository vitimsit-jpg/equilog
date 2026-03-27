"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DISCIPLINE_LABELS } from "@/lib/utils";
import { trackEvent } from "@/lib/trackEvent";
import { canAddHorse } from "@/lib/plans";

type RoleChoice = "owner_rider" | "guardian";

const disciplineOptions = Object.entries(DISCIPLINE_LABELS).map(([value, label]) => ({ value, label }));

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 35 }, (_, i) => {
  const y = currentYear - i;
  return { value: String(y), label: String(y) };
});

export default function NewHorsePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "p0_role">("form");
  const [createdHorseId, setCreatedHorseId] = useState<string | null>(null);
  const [createdHorseName, setCreatedHorseName] = useState<string>("");
  const [form, setForm] = useState({
    name: "",
    breed: "",
    birth_year: "",
    discipline: "",
    region: "",
    ecurie: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { count: horseCount } = await supabase.from("horses").select("*", { count: "exact", head: true }).eq("user_id", user.id);
    const { data: userProfile } = await supabase.from("users").select("plan").eq("id", user.id).single();
    const plan = (userProfile?.plan || "starter") as "starter" | "pro" | "ecurie";
    if (!canAddHorse(plan, horseCount || 0)) {
      toast.error("Vous avez atteint la limite de chevaux pour le plan Starter. Passez au plan Pro pour en ajouter plus.");
      router.push("/settings");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("horses")
      .insert({
        user_id: user.id,
        name: form.name.trim(),
        breed: form.breed || null,
        birth_year: form.birth_year ? parseInt(form.birth_year) : null,
        discipline: (form.discipline as any) || null,
        region: form.region || null,
        ecurie: form.ecurie || null,
        share_horse_index: true,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erreur lors de la création");
      setLoading(false);
      return;
    }

    trackEvent({ event_name: "horse_created", event_category: "horse", properties: { discipline: form.discipline || null, has_ecurie: !!form.ecurie } });
    setCreatedHorseId(data.id);
    setCreatedHorseName(data.name);
    setLoading(false);
    // Étape P0 TRAV-19 : demander le rôle avant de continuer
    setStep("p0_role");
  };

  const handleRoleChoice = async (choice: RoleChoice) => {
    if (!createdHorseId) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    await supabase.from("horse_user_roles").upsert({
      horse_id: createdHorseId,
      user_id: user.id,
      role: "owner",
      rides_horse: choice === "owner_rider",
    }, { onConflict: "horse_id,user_id" });

    toast.success(`${createdHorseName} ajouté !`);
    setLoading(false);
    router.push(`/horses/${createdHorseId}`);
    router.refresh();
  };

  // Étape P0 — Rôle cavalier / gardien (TRAV-19)
  if (step === "p0_role") {
    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="card space-y-6 py-8 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-beige flex items-center justify-center text-3xl mx-auto">🐴</div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-black">Votre rôle avec {createdHorseName}</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Cette info personnalise le suivi et le Horse Index.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-left">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleRoleChoice("owner_rider")}
              className="flex flex-col items-start gap-2 p-4 rounded-2xl border-2 border-gray-100 hover:border-orange hover:bg-orange-light transition-all"
            >
              <span className="text-2xl">🧑‍🦯</span>
              <span className="text-sm font-bold text-black">Je monte</span>
              <span className="text-xs text-gray-400 leading-snug">Je pratique activement avec ce cheval</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleRoleChoice("guardian")}
              className="flex flex-col items-start gap-2 p-4 rounded-2xl border-2 border-gray-100 hover:border-orange hover:bg-orange-light transition-all"
            >
              <span className="text-2xl">🌿</span>
              <span className="text-sm font-bold text-black">Je suis gardien</span>
              <span className="text-xs text-gray-400 leading-snug">Je m&apos;en occupe sans le monter (retraite, poulain…)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="btn-ghost">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-black">Nouveau cheval</h1>
          <p className="text-sm text-gray-400">Ajoutez un cheval à votre compte</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Nom du cheval *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Jackson"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Race"
              value={form.breed}
              onChange={(e) => setForm({ ...form, breed: e.target.value })}
              placeholder="Selle Français"
            />
            <Select
              label="Année de naissance"
              value={form.birth_year}
              onChange={(e) => setForm({ ...form, birth_year: e.target.value })}
              options={yearOptions}
              placeholder="Sélectionner"
            />
          </div>

          <Select
            label="Discipline principale"
            value={form.discipline}
            onChange={(e) => setForm({ ...form, discipline: e.target.value })}
            options={disciplineOptions}
            placeholder="Sélectionner"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Région"
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              placeholder="Île-de-France"
            />
            <Input
              label="Écurie"
              value={form.ecurie}
              onChange={(e) => setForm({ ...form, ecurie: e.target.value })}
              placeholder="Écurie du Val"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Link href="/dashboard" className="btn-secondary flex-1 text-center">
              Annuler
            </Link>
            <Button type="submit" loading={loading} className="flex-1">
              Créer le profil
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
