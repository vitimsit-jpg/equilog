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
import type { HorseIndexMode } from "@/lib/supabase/types";

type RoleChoice = "owner_rider" | "guardian";

const disciplineOptions = Object.entries(DISCIPLINE_LABELS).map(([value, label]) => ({ value, label }));

const MODE_VIE_OPTIONS: { mode: HorseIndexMode; emoji: string; label: string; desc: string }[] = [
  { mode: "IE",  emoji: "🌿", label: "Équilibre",    desc: "Pratique régulière, loisir ou club" },
  { mode: "IC",  emoji: "🏆", label: "Compétition",  desc: "Préparation et sorties en concours" },
  { mode: "ICr", emoji: "🌱", label: "Croissance",   desc: "Poulain ou jeune cheval en développement" },
  { mode: "IR",  emoji: "💊", label: "Convalescence",desc: "Blessure, arrêt ou repos médical" },
  { mode: "IS",  emoji: "🌸", label: "Retraite",     desc: "Cheval retraité ou à très faible activité" },
  { mode: "IP",  emoji: "🔄", label: "Rééducation",  desc: "Reprise progressive après blessure ou pause" },
];

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
  const [modeVie, setModeVie] = useState<HorseIndexMode | "">("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    if (!modeVie) {
      toast.error("Le mode de vie est requis pour activer le Horse Index");
      return;
    }
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { count: horseCount } = await supabase.from("horses").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      const { data: userProfile } = await supabase.from("users").select("plan").eq("id", user.id).maybeSingle();
      const plan = (userProfile?.plan || "ecurie") as "starter" | "pro" | "ecurie";
      if (!canAddHorse(plan, horseCount || 0)) {
        toast.error("Limite de chevaux atteinte pour votre plan.");
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
          horse_index_mode: modeVie || null,
          share_horse_index: true,
        })
        .select()
        .single();

      if (error) {
        toast.error(`Erreur : ${error.message}`);
        setLoading(false);
        return;
      }

      trackEvent({ event_name: "horse_created", event_category: "horse", properties: { discipline: form.discipline || null, has_ecurie: !!form.ecurie } });
      setCreatedHorseId(data.id);
      setCreatedHorseName(data.name);
      setLoading(false);
      setStep("p0_role");
    } catch (err) {
      toast.error("Erreur inattendue — réessayez");
      setLoading(false);
    }
  };

  const handleRoleChoice = async (choice: RoleChoice) => {
    if (!createdHorseId) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { error } = await supabase.from("horse_user_roles").upsert({
        horse_id: createdHorseId,
        user_id: user.id,
        role: "owner",
        rides_horse: choice === "owner_rider",
      }, { onConflict: "horse_id,user_id" });

      if (error) {
        // Non-blocking: horse was created, role upsert can fail silently
      }

      toast.success(`${createdHorseName} ajouté !`);
      router.push(`/horses/${createdHorseId}`);
      router.refresh();
    } catch (err) {
      toast.error("Erreur inattendue — réessayez");
    } finally {
      setLoading(false);
    }
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
              <span className="text-2xl">🏇</span>
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

          <div>
            <label className="label mb-1 block">Mode de vie <span className="text-orange">*</span></label>
            <p className="text-xs text-gray-400 mb-2">Détermine l&apos;indice Horse Index adapté à votre cheval.</p>
            <div className="grid grid-cols-2 gap-2">
              {MODE_VIE_OPTIONS.map((m) => (
                <button
                  key={m.mode}
                  type="button"
                  onClick={() => setModeVie(m.mode)}
                  className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border-2 text-left transition-all ${
                    modeVie === m.mode
                      ? "border-orange bg-orange-light"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{m.emoji}</span>
                    <span className={`text-xs font-semibold ${modeVie === m.mode ? "text-orange" : "text-gray-700"}`}>{m.label}</span>
                  </div>
                  <span className={`text-2xs leading-tight ${modeVie === m.mode ? "text-orange/70" : "text-gray-400"}`}>{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

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
