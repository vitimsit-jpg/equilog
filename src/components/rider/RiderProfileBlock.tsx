"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/lib/supabase/types";

interface Props {
  user: User;
}

const NIVEAU_OPTIONS = [
  { value: "debutant", label: "Débutant", emoji: "🌱" },
  { value: "amateur", label: "Amateur", emoji: "🐴" },
  { value: "confirme", label: "Confirmé", emoji: "⭐" },
  { value: "pro", label: "Pro", emoji: "🏆" },
] as const;

const DISCIPLINES_OPTIONS = [
  "CSO", "Dressage", "CCE", "Endurance", "TREC", "Western", "Loisir", "Autre",
];

const FREQUENCE_OPTIONS = [
  { value: 1, label: "1×/sem" },
  { value: 2, label: "2×/sem" },
  { value: 3, label: "3×/sem" },
  { value: 4, label: "4×/sem" },
  { value: 5, label: "5×/sem et +" },
];

const OBJECTIF_OPTIONS = [
  { value: "loisir", label: "Loisir", emoji: "🌿" },
  { value: "progression", label: "Progresser", emoji: "📈" },
  { value: "competition", label: "Compétition", emoji: "🏆" },
  { value: "remise_en_forme", label: "Remise en forme", emoji: "💪" },
] as const;

const ZONES_DOULOUREUSES = [
  "Lombaires (bas du dos)",
  "Nuque / cervicales",
  "Épaules",
  "Milieu du dos",
  "Bassin / sacro-iliaque",
  "Hanches / adducteurs",
  "Genoux",
  "Poignets",
  "Chevilles",
  "Autre",
];

const ASYMETRIE_OPTIONS = [
  { value: "droite", label: "Plus raide à droite" },
  { value: "gauche", label: "Plus raide à gauche" },
  { value: "symetrique", label: "Plutôt symétrique" },
  { value: "ne_sais_pas", label: "Je ne sais pas" },
] as const;

export default function RiderProfileBlock({ user }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [niveau, setNiveau] = useState<string | null>(user.rider_niveau ?? null);
  const [disciplines, setDisciplines] = useState<string[]>(user.rider_disciplines ?? []);
  const [frequence, setFrequence] = useState<number | null>(user.rider_frequence ?? null);
  const [objectif, setObjectif] = useState<string | null>(user.rider_objectif ?? null);
  const [zones, setZones] = useState<string[]>((user as any).rider_zones_douloureuses ?? []);
  const [asymetrie, setAsymetrie] = useState<string | null>((user as any).rider_asymetrie ?? null);
  const [pathologies, setPathologies] = useState<string>((user as any).rider_pathologies ?? "");
  const [saving, setSaving] = useState(false);

  const toggleDiscipline = (d: string) => {
    setDisciplines((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const toggleZone = (z: string) => {
    setZones((prev) =>
      prev.includes(z) ? prev.filter((x) => x !== z) : [...prev, z]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("users")
      .update({
        rider_niveau: niveau as User["rider_niveau"],
        rider_disciplines: disciplines.length > 0 ? disciplines : null,
        rider_frequence: frequence,
        rider_objectif: objectif as User["rider_objectif"],
        rider_zones_douloureuses: zones.length > 0 ? zones : null,
        rider_asymetrie: asymetrie as User["rider_asymetrie"],
        rider_pathologies: pathologies.trim() || null,
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Profil cavalier sauvegardé");
      router.refresh();
    }
    setSaving(false);
  };

  const btnClass = (selected: boolean) =>
    `px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
      selected
        ? "bg-black text-white border-black"
        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
    }`;

  return (
    <div className="card">
      <h2 className="font-bold text-black text-sm mb-4">Mon profil cavalier 🏇</h2>

      {/* Niveau */}
      <div className="mb-4">
        <p className="label mb-2">Mon niveau en équitation</p>
        <div className="flex flex-wrap gap-2">
          {NIVEAU_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setNiveau(niveau === opt.value ? null : opt.value)}
              className={btnClass(niveau === opt.value)}
            >
              {opt.emoji} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Disciplines */}
      <div className="mb-4">
        <p className="label mb-2">Mes disciplines</p>
        <div className="flex flex-wrap gap-2">
          {DISCIPLINES_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDiscipline(d)}
              className={btnClass(disciplines.includes(d))}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Fréquence */}
      <div className="mb-4">
        <p className="label mb-2">Je monte en moyenne</p>
        <div className="flex flex-wrap gap-2">
          {FREQUENCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFrequence(frequence === opt.value ? null : opt.value)}
              className={btnClass(frequence === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Objectif */}
      <div className="mb-5">
        <p className="label mb-2">Mon objectif principal</p>
        <div className="flex flex-wrap gap-2">
          {OBJECTIF_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setObjectif(objectif === opt.value ? null : opt.value)}
              className={btnClass(objectif === opt.value)}
            >
              {opt.emoji} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Douleurs & pathologies chroniques */}
      <div className="pt-4 border-t border-gray-100 mb-4">
        <p className="font-semibold text-black text-sm mb-1">Douleurs & pathologies chroniques</p>
        <p className="text-xs text-gray-400 mb-4">Ces informations restent privées et aident l&apos;IA à personnaliser ses conseils.</p>

        {/* Zones douloureuses */}
        <div className="mb-4">
          <p className="label mb-2">Zones douloureuses habituelles</p>
          <div className="flex flex-wrap gap-2">
            {ZONES_DOULOUREUSES.map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => toggleZone(z)}
                className={btnClass(zones.includes(z))}
              >
                {z}
              </button>
            ))}
          </div>
        </div>

        {/* Asymétrie */}
        <div className="mb-3">
          <p className="label mb-2">Asymétrie / raideur</p>
          <div className="flex flex-wrap gap-2">
            {ASYMETRIE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAsymetrie(asymetrie === opt.value ? null : opt.value)}
                className={btnClass(asymetrie === opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
            La raideur d&apos;un côté se ressent souvent dans les transitions, les cercles ou les appuis en étriers.
          </p>
        </div>

        {/* Pathologies connues */}
        <div className="mb-5">
          <p className="label mb-2">Pathologies connues <span className="font-normal text-gray-400">(optionnel)</span></p>
          <textarea
            value={pathologies}
            onChange={(e) => setPathologies(e.target.value)}
            placeholder="Ex : scoliose, hernie discale, tendinite chronique…"
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black resize-none"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full"
      >
        {saving ? "Sauvegarde…" : "Sauvegarder"}
      </button>
    </div>
  );
}
