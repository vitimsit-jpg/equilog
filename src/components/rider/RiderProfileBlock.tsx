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

const PRATICIENS = [
  { key: "kine", label: "Kinésithérapeute" },
  { key: "osteo", label: "Ostéopathe" },
  { key: "podologue", label: "Podologue" },
  { key: "coach", label: "Préparateur physique / Coach sportif" },
] as const;

const FREQUENCES_SUIVI = [
  { value: "ponctuel", label: "Ponctuel" },
  { value: "2_3_semaines", label: "Toutes les 2-3 semaines" },
  { value: "mensuel", label: "Mensuel" },
  { value: "hebdomadaire", label: "Hebdomadaire" },
] as const;

const ACTIVITE_TYPES = [
  "Yoga", "Pilates", "Musculation / Renforcement", "Running",
  "Natation", "Vélo", "Sports collectifs", "Aucune", "Autre",
];

const ACTIVITE_FREQUENCES = [
  { value: "jamais", label: "Jamais" },
  { value: "1x_semaine", label: "1× par semaine" },
  { value: "2_3x_semaine", label: "2-3× par semaine" },
  { value: "4x_plus", label: "4× et plus" },
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
  const [suiviCorps, setSuiviCorps] = useState<Record<string, { actif: boolean; frequence?: string }>>(
    (user as any).rider_suivi_corps ?? {}
  );
  const [activiteTypes, setActiviteTypes] = useState<string[]>((user as any).rider_activite_types ?? []);
  const [activiteFrequence, setActiviteFrequence] = useState<string | null>((user as any).rider_activite_frequence ?? null);

  const toggleActivite = (a: string) => {
    setActiviteTypes((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  };
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
        rider_suivi_corps: Object.keys(suiviCorps).length > 0 ? suiviCorps : null,
        rider_activite_types: activiteTypes.length > 0 ? activiteTypes : null,
        rider_activite_frequence: activiteFrequence,
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
        <div>
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

      {/* Suivi corps */}
      <div className="pt-4 border-t border-gray-100 mb-5">
        <p className="font-semibold text-black text-sm mb-1">Suivi corps</p>
        <p className="text-xs text-gray-400 mb-4">Praticiens que vous consultez régulièrement.</p>
        <div className="space-y-3">
          {PRATICIENS.map(({ key, label }) => {
            const entry = suiviCorps[key];
            const actif = entry?.actif ?? false;
            return (
              <div key={key}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-black">{label}</span>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setSuiviCorps((prev) => ({ ...prev, [key]: { actif: true, frequence: prev[key]?.frequence } }))}
                      className={`px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all ${actif ? "border-black bg-black text-white" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                    >
                      Oui
                    </button>
                    <button
                      type="button"
                      onClick={() => setSuiviCorps((prev) => { const next = { ...prev }; delete next[key]; return next; })}
                      className={`px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all ${!actif && key in suiviCorps ? "border-gray-400 bg-gray-100 text-gray-600" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                    >
                      Non
                    </button>
                  </div>
                </div>
                {actif && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {FREQUENCES_SUIVI.map(({ value, label: flabel }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSuiviCorps((prev) => ({ ...prev, [key]: { actif: true, frequence: value } }))}
                        className={`px-3 py-1.5 rounded-xl border-2 text-xs font-medium transition-all ${
                          entry?.frequence === value ? "border-black bg-black text-white" : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {flabel}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Forme & activité physique hors équitation */}
      <div className="pt-4 border-t border-gray-100 mb-5">
        <p className="font-semibold text-black text-sm mb-1">Forme & activité physique hors équitation</p>
        <p className="text-xs text-gray-400 mb-4">Pour mieux calibrer vos recommandations de récupération.</p>

        <div className="mb-4">
          <p className="label mb-2">Type d&apos;activité</p>
          <div className="flex flex-wrap gap-2">
            {ACTIVITE_TYPES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggleActivite(a)}
                className={btnClass(activiteTypes.includes(a))}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="label mb-2">Fréquence</p>
          <div className="flex flex-wrap gap-2">
            {ACTIVITE_FREQUENCES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiviteFrequence(activiteFrequence === value ? null : value)}
                className={btnClass(activiteFrequence === value)}
              >
                {label}
              </button>
            ))}
          </div>
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
