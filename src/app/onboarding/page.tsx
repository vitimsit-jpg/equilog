"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import type { ProfileType, HorseIndexMode } from "@/lib/supabase/types";
import { Check, ArrowRight, ArrowLeft, ChevronRight, Plus, Trash2, Bell, ChevronDown } from "lucide-react";
import PushNotificationToggle from "@/components/settings/PushNotificationToggle";

// ─── Données statiques ──────────────────────────────────────────────────────

const PROFILES: { type: ProfileType; emoji: string; title: string; subtitle: string }[] = [
  { type: "loisir",      emoji: "🌿", title: "Je monte pour le plaisir",          subtitle: "Je suis propriétaire ou en demi-pension" },
  { type: "competition", emoji: "🏆", title: "Je fais des concours régulièrement", subtitle: "Licence FFE Compétition, 5 à 50 sorties/an" },
  { type: "pro",         emoji: "⭐", title: "Le cheval est mon activité pro",      subtitle: "Je vis du cheval : vente, cours, pension..." },
  { type: "gerant",      emoji: "🏘", title: "Je gère une structure équestre",      subtitle: "Centre équestre, écurie de propriétaires..." },
];

const MODE_VIE_OPTIONS: { mode: HorseIndexMode; emoji: string; label: string }[] = [
  { mode: "IE",  emoji: "🌿", label: "Actif loisir" },
  { mode: "IC",  emoji: "🏆", label: "Actif compétition" },
  { mode: "IP",  emoji: "🐾", label: "Semi-actif" },
  { mode: "IR",  emoji: "💊", label: "Convalescence" },
  { mode: "IS",  emoji: "🌸", label: "Retraite" },
  { mode: "ICr", emoji: "🌱", label: "Poulain" },
];

const DISCIPLINES = ["CSO", "CCE", "Dressage", "Endurance", "TREC", "Équitation Western", "Hunter", "Autre"];

const GRAMMAGES = [0, 50, 100, 150, 200, 300, 400];

// ─── Types internes ─────────────────────────────────────────────────────────

type Couverture = { label: string; grammage: number; impermeable: boolean };

// ─── Helpers navigation ────────────────────────────────────────────────────

// Steps: 1=profil 2=modules 3=cheval 4=trousseau 5=notifs 6=success
function getSteps(profile: ProfileType): number[] {
  if (profile === "gerant") return [1, 5]; // skip modules, cheval, trousseau
  return [1, 2, 3, 4, 5];
}

// ─── Composant ─────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [createdHorseId, setCreatedHorseId] = useState<string | null>(null);

  // Step 1 — profil
  const [selectedProfile, setSelectedProfile] = useState<ProfileType>("loisir");
  const [displayName, setDisplayName] = useState("");

  // Step 2 — modules
  const [moduleCoach, setModuleCoach] = useState(false);
  const [moduleGerant, setModuleGerant] = useState(false);

  // Step 3 — cheval
  const [horseName, setHorseName] = useState("");
  const [modeVie, setModeVie] = useState<HorseIndexMode | "">("");
  const [discipline, setDiscipline] = useState("");
  const [breed, setBreed] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [sexe, setSexe] = useState<"" | "hongre" | "jument" | "etalon">("");
  const [ecurie, setEcurie] = useState("");
  const [logement, setLogement] = useState<"" | "box" | "pre" | "box_paddock">("");
  const [tonte, setTonte] = useState<"" | "non_tondu" | "partielle" | "complete">("");

  // Step 4 — trousseau
  const [trousseau, setTrousseau] = useState<Couverture[]>([]);
  const [newCouv, setNewCouv] = useState<{ grammage: string; impermeable: boolean }>({ grammage: "", impermeable: false });

  // Step 3 — toggle détails
  const [showHorseDetails, setShowHorseDetails] = useState(false);

  // Step 5 — notifs
  const [notifHealth, setNotifHealth] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(true);

  // Guard: already onboarded → redirect
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("users")
        .select("onboarding_completed, profile_type, user_type, name")
        .eq("id", user.id)
        .single();
      if ((data as any)?.onboarding_completed) {
        router.replace("/dashboard");
      }
      if (data?.name) setDisplayName(data.name);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation ─────────────────────────────────────────────────────────

  const steps = getSteps(selectedProfile);
  const currentIdx = steps.indexOf(step);
  const isLastStep = currentIdx === steps.length - 1;

  const nextStep = () => {
    if (isLastStep) {
      setStep(6); // success
    } else {
      setStep(steps[currentIdx + 1]);
    }
  };

  const prevStep = () => {
    if (currentIdx > 0) setStep(steps[currentIdx - 1]);
  };

  // ── Sauvegardes par étape ──────────────────────────────────────────────

  const handleStep1Next = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); setLoading(false); return; }
    setUserId(user.id);

    const legacyUserType = selectedProfile === "gerant" ? "gerant_ecurie" : selectedProfile;
    const effectiveModuleGerant = selectedProfile === "gerant" ? true : moduleGerant;

    await supabase.from("users").update({
      profile_type: selectedProfile,
      user_type: legacyUserType,
      module_gerant: effectiveModuleGerant,
      ...(displayName.trim() && { name: displayName.trim(), profile_display_name: displayName.trim() }),
      onboarding_step: 1,
    }).eq("id", user.id);

    nextStep();
    setLoading(false);
  };

  const handleStep2Next = async () => {
    if (!userId) { nextStep(); return; }
    setLoading(true);
    await supabase.from("users").update({
      module_coach: moduleCoach,
      module_gerant: moduleGerant,
      onboarding_step: 2,
    }).eq("id", userId);
    nextStep();
    setLoading(false);
  };

  const handleStep3Next = async () => {
    if (!horseName.trim() || !modeVie) {
      toast.error("Le nom et le mode de vie sont requis");
      return;
    }
    if ((selectedProfile === "competition" || selectedProfile === "pro") && !discipline) {
      toast.error("La discipline est requise pour ce profil");
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: horse, error } = await supabase.from("horses").insert({
      user_id: user.id,
      name: horseName.trim(),
      horse_index_mode: modeVie,
      discipline: discipline || null,
      breed: breed.trim() || null,
      birth_year: birthYear ? parseInt(birthYear) : null,
      sexe: sexe || null,
      ecurie: ecurie.trim() || null,
      conditions_vie: logement || null,
      tonte: tonte || null,
    }).select("id").single();

    if (error || !horse) {
      toast.error("Erreur lors de la création du cheval");
      setLoading(false);
      return;
    }
    setCreatedHorseId(horse.id);
    await supabase.from("users").update({ onboarding_step: 3 }).eq("id", user.id);
    nextStep();
    setLoading(false);
  };

  const handleStep4Next = async () => {
    if (createdHorseId && trousseau.length > 0) {
      await supabase.from("horses").update({ trousseau }).eq("id", createdHorseId);
    }
    if (userId) await supabase.from("users").update({ onboarding_step: 4 }).eq("id", userId);
    nextStep();
  };

  const handleFinish = async () => {
    if (!userId) { router.push("/dashboard"); return; }
    setLoading(true);
    await supabase.from("users").update({
      notify_health_reminders: notifHealth,
      notify_weekly_summary: notifWeekly,
      onboarding_step: 5,
      onboarding_completed: true,
    }).eq("id", userId);
    nextStep();
    setLoading(false);
  };

  // ─── UI Helpers ────────────────────────────────────────────────────────

  const Logo = () => (
    <div className="text-center mb-6">
      <div className="inline-flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center">
          <span className="text-white font-black">E</span>
        </div>
        <span className="font-black text-black text-xl tracking-tight">EQUISTRA</span>
      </div>
    </div>
  );

  const ProgressBar = () => (
    <div className="flex items-center justify-center gap-1.5 mb-8">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1.5">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            step === s ? "bg-black text-white scale-110"
              : step > s || (step === 6) ? "bg-green-500 text-white"
              : "bg-gray-100 text-gray-400"
          }`}>
            {(step > s || step === 6) ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 h-0.5 transition-all ${(step > s || step === 6) ? "bg-green-500" : "bg-gray-100"}`} />
          )}
        </div>
      ))}
    </div>
  );

  const isDisciplineRequired = selectedProfile === "competition" || selectedProfile === "pro";
  const isDisciplineVisible = selectedProfile !== "loisir";

  // ─── Step 6 : Succès ───────────────────────────────────────────────────

  if (step === 6) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-full bg-black text-white flex items-center justify-center mx-auto mb-6 animate-fade-in">
            <span className="text-4xl">🐴</span>
          </div>
          <h1 className="text-2xl font-black text-black mb-2">
            {displayName.trim() ? `Bienvenue, ${displayName.trim()} !` : "C'est parti !"}
          </h1>
          <p className="text-sm text-gray-500 mb-1">
            Votre profil est configuré.
            {horseName.trim() && (
              <> <span className="font-semibold text-black">{horseName.trim()}</span> est prêt.</>
            )}
          </p>
          <p className="text-xs text-gray-400 mb-8">
            Calculez votre Horse Index, enregistrez une séance ou complétez le carnet de santé.
          </p>
          <button
            onClick={() => router.push(createdHorseId ? `/horses/${createdHorseId}` : "/dashboard")}
            className="btn-primary w-full justify-center"
          >
            {createdHorseId ? "Voir la fiche de mon cheval" : "Accéder au tableau de bord"}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ─── Steps 1–5 ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <Logo />
        <ProgressBar />

        {/* ── Step 1 : Profil ── */}
        {step === 1 && (
          <div>
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-black">Quel est votre rapport principal au cheval ?</h1>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {PROFILES.map((p) => (
                <button
                  key={p.type}
                  onClick={() => setSelectedProfile(p.type)}
                  className={`text-left p-4 rounded-2xl border-2 transition-all ${
                    selectedProfile === p.type
                      ? "border-black bg-black text-white"
                      : "border-gray-100 bg-white hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl block mb-1">{p.emoji}</span>
                  <p className={`font-bold text-sm ${selectedProfile === p.type ? "text-white" : "text-black"}`}>{p.title}</p>
                  <p className={`text-xs mt-0.5 ${selectedProfile === p.type ? "text-gray-300" : "text-gray-400"}`}>{p.subtitle}</p>
                </button>
              ))}
            </div>

            {/* Prénom / pseudo */}
            <div className="mb-5">
              <label className="label">Comment souhaitez-vous être appelé ? <span className="text-gray-400 font-normal text-xs">(optionnel)</span></label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex : Marie, Julien, Caro..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black mt-1"
              />
            </div>

            <button
              onClick={handleStep1Next}
              disabled={loading}
              className="btn-primary w-full justify-center disabled:opacity-40"
            >
              {loading ? "Enregistrement…" : "Continuer"} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Step 2 : Modules (P1/P2/P3 seulement) ── */}
        {step === 2 && (
          <div>
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-black">Modules complémentaires</h1>
              <p className="text-sm text-gray-400 mt-1">Activables à tout moment dans les réglages.</p>
            </div>

            <div className="space-y-3 mb-6">
              <button
                type="button"
                onClick={() => setModuleCoach(!moduleCoach)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                  moduleCoach ? "border-black bg-black" : "border-gray-100 hover:border-gray-300"
                }`}
              >
                <span className="text-3xl flex-shrink-0">🎯</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm ${moduleCoach ? "text-white" : "text-black"}`}>Entraînez-vous d&apos;autres cavaliers ?</p>
                  <p className={`text-xs mt-0.5 ${moduleCoach ? "text-gray-300" : "text-gray-400"}`}>Suivi élèves, plans d&apos;entraînement</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  moduleCoach ? "border-white bg-white" : "border-gray-300"
                }`}>
                  {moduleCoach && <Check className="h-3 w-3 text-black" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setModuleGerant(!moduleGerant)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                  moduleGerant ? "border-black bg-black" : "border-gray-100 hover:border-gray-300"
                }`}
              >
                <span className="text-3xl flex-shrink-0">🏢</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm ${moduleGerant ? "text-white" : "text-black"}`}>Gérez-vous une structure avec des pensionnaires ?</p>
                  <p className={`text-xs mt-0.5 ${moduleGerant ? "text-gray-300" : "text-gray-400"}`}>Dashboard écurie, alertes groupées</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  moduleGerant ? "border-white bg-white" : "border-gray-300"
                }`}>
                  {moduleGerant && <Check className="h-3 w-3 text-black" />}
                </div>
              </button>
            </div>

            <div className="flex gap-3">
              <button onClick={prevStep} className="btn-ghost flex items-center gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Retour
              </button>
              <div className="flex-1 flex flex-col gap-2">
                <button
                  onClick={handleStep2Next}
                  disabled={loading}
                  className="btn-primary w-full justify-center disabled:opacity-40"
                >
                  {loading ? "Enregistrement…" : "Continuer"} <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => { nextStep(); }} className="text-xs text-center text-gray-400 hover:text-black py-1">
                  Passer cette étape →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3 : Cheval ── */}
        {step === 3 && (
          <div>
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-black">Votre premier cheval</h1>
              <p className="text-sm text-gray-400 mt-1">Nom et mode de vie sont requis pour activer le Horse Index.</p>
            </div>

            <div className="space-y-4 mb-6">
              {/* Nom — obligatoire */}
              <div>
                <label className="label">Nom <span className="text-orange">*</span></label>
                <input
                  type="text"
                  value={horseName}
                  onChange={(e) => setHorseName(e.target.value)}
                  placeholder="Ex : Jackson, Sultan, Roxane…"
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black mt-1"
                />
              </div>

              {/* Mode de vie — obligatoire */}
              <div>
                <label className="label">Mode de vie <span className="text-orange">*</span></label>
                <p className="text-2xs text-gray-400 mt-0.5 mb-2">Détermine l&apos;Indice Horse Index adapté à votre cheval.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MODE_VIE_OPTIONS.map((m) => (
                    <button
                      key={m.mode}
                      type="button"
                      onClick={() => setModeVie(m.mode)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition-all ${
                        modeVie === m.mode
                          ? "border-orange bg-orange-light"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="text-lg">{m.emoji}</span>
                      <span className={`text-xs font-semibold ${modeVie === m.mode ? "text-orange" : "text-gray-700"}`}>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Discipline — conditionnelle */}
              {isDisciplineVisible && (
                <div>
                  <label className="label">
                    Discipline principale{" "}
                    {isDisciplineRequired
                      ? <span className="text-orange">*</span>
                      : <span className="text-gray-400 font-normal text-xs">(optionnel)</span>
                    }
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {DISCIPLINES.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDiscipline(discipline === d ? "" : d)}
                        className={`p-2.5 rounded-xl border-2 text-left text-xs font-medium transition-all ${
                          discipline === d ? "border-black bg-black text-white" : "border-gray-200 hover:border-gray-300 text-gray-700"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Race + année */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Race <span className="text-gray-400 font-normal text-xs">(optionnel)</span></label>
                  <input
                    type="text"
                    value={breed}
                    onChange={(e) => setBreed(e.target.value)}
                    placeholder="SF, PSH, Anglo…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black mt-1"
                  />
                </div>
                <div>
                  <label className="label">Naissance <span className="text-gray-400 font-normal text-xs">(optionnel)</span></label>
                  <input
                    type="number"
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    placeholder={String(new Date().getFullYear() - 5)}
                    min={1980}
                    max={new Date().getFullYear()}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black mt-1"
                  />
                </div>
              </div>

              {/* Détails optionnels — accordéon */}
              <button
                type="button"
                onClick={() => setShowHorseDetails((v) => !v)}
                className="flex items-center justify-between w-full py-2 text-sm text-gray-500 hover:text-black transition-colors"
              >
                <span className="font-semibold">Détails optionnels</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showHorseDetails ? "rotate-180" : ""}`} />
              </button>

              {showHorseDetails && (
                <div className="space-y-4 pt-2">
                  {/* Sexe */}
                  <div>
                    <label className="label">Sexe</label>
                    <div className="flex gap-2 mt-1">
                      {(["hongre", "jument", "etalon"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSexe(sexe === s ? "" : s)}
                          className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium capitalize transition-all ${
                            sexe === s ? "border-black bg-black text-white" : "border-gray-200 hover:border-gray-400"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Localisation écurie */}
                  <div>
                    <label className="label">Localisation de l&apos;écurie <span className="text-gray-400 font-normal text-xs">(pour la météo)</span></label>
                    <input
                      type="text"
                      value={ecurie}
                      onChange={(e) => setEcurie(e.target.value)}
                      placeholder="Ex : Écurie du Val, 75001 Paris"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black mt-1"
                    />
                  </div>

                  {/* Logement + tonte */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Logement</label>
                      <div className="flex flex-col gap-1.5 mt-1">
                        {([["box", "Box"], ["pre", "Pré"], ["box_paddock", "Mixte"]] as const).map(([val, lbl]) => (
                          <button key={val} type="button" onClick={() => setLogement(logement === val ? "" : val)}
                            className={`py-2 rounded-xl border-2 text-xs font-medium transition-all ${
                              logement === val ? "border-black bg-black text-white" : "border-gray-200 hover:border-gray-300 text-gray-700"
                            }`}
                          >{lbl}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="label">Tonte</label>
                      <div className="flex flex-col gap-1.5 mt-1">
                        {([["non_tondu", "Non tondu"], ["partielle", "Partielle"], ["complete", "Complète"]] as const).map(([val, lbl]) => (
                          <button key={val} type="button" onClick={() => setTonte(tonte === val ? "" : val)}
                            className={`py-2 rounded-xl border-2 text-xs font-medium transition-all ${
                              tonte === val ? "border-black bg-black text-white" : "border-gray-200 hover:border-gray-300 text-gray-700"
                            }`}
                          >{lbl}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={prevStep} className="btn-ghost flex items-center gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Retour
              </button>
              <button
                onClick={handleStep3Next}
                disabled={loading || !horseName.trim() || !modeVie}
                className="btn-primary flex-1 justify-center disabled:opacity-40"
              >
                {loading ? "Enregistrement…" : "Continuer"} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4 : Trousseau ── */}
        {step === 4 && (
          <div>
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-black">
                Quelles couvertures avez-vous{horseName ? ` pour ${horseName}` : ""} ?
              </h1>
              <p className="text-sm text-gray-400 mt-1">Pour des recommandations couverture personnalisées.</p>
            </div>

            {/* Liste couvertures */}
            {trousseau.length > 0 && (
              <div className="space-y-2 mb-4">
                {trousseau.map((c, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-black">{c.grammage}g</span>
                      {c.impermeable && <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">Imperméable</span>}
                    </div>
                    <button type="button" onClick={() => setTrousseau(trousseau.filter((_, j) => j !== i))}>
                      <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Ajouter une couverture */}
            <div className="mb-6">
              <p className="label mb-2">Ajouter une couverture</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {GRAMMAGES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setNewCouv({ ...newCouv, grammage: String(g) })}
                    className={`px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                      newCouv.grammage === String(g) ? "border-black bg-black text-white" : "border-gray-200 text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    {g === 0 ? "0g (filet)" : `${g}g`}
                  </button>
                ))}
                <input
                  type="number"
                  value={newCouv.grammage && !GRAMMAGES.includes(parseInt(newCouv.grammage)) ? newCouv.grammage : ""}
                  onChange={(e) => setNewCouv({ ...newCouv, grammage: e.target.value })}
                  placeholder="Autre…"
                  className="w-20 border border-gray-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:border-black"
                />
              </div>
              <div className="flex items-center gap-3 mb-3">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCouv.impermeable}
                    onChange={(e) => setNewCouv({ ...newCouv, impermeable: e.target.checked })}
                    className="rounded"
                  />
                  Imperméable
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!newCouv.grammage) return;
                  const g = parseInt(newCouv.grammage);
                  if (isNaN(g)) return;
                  setTrousseau([...trousseau, { label: `${g}g`, grammage: g, impermeable: newCouv.impermeable }]);
                  setNewCouv({ grammage: "", impermeable: false });
                }}
                disabled={!newCouv.grammage}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white text-sm font-semibold disabled:opacity-40"
              >
                <Plus className="h-4 w-4" /> Ajouter
              </button>
            </div>

            <div className="flex gap-3">
              <button onClick={prevStep} className="btn-ghost flex items-center gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Retour
              </button>
              <div className="flex-1 flex flex-col gap-2">
                <button
                  onClick={handleStep4Next}
                  className="btn-primary w-full justify-center"
                >
                  Continuer <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => nextStep()} className="text-xs text-center text-gray-400 hover:text-black py-1">
                  Passer cette étape →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 5 : Notifications ── */}
        {step === 5 && (
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center mx-auto mb-3">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-black">Notifications</h1>
              <p className="text-sm text-gray-400 mt-1">Ne manquez aucun rappel de soins ou alerte importante.</p>
            </div>

            <div className="card space-y-0 mb-4">
              {/* Push */}
              <div className="pb-3 mb-3 border-b border-gray-100">
                <PushNotificationToggle />
              </div>

              {/* Email prefs */}
              {[
                { key: "notifHealth" as const, label: "Alertes soins", desc: "Rappels vaccin, ferrage, vermifuge, dentiste — J-7 et retard", value: notifHealth, set: setNotifHealth },
                { key: "notifWeekly" as const, label: "Bilan IA du dimanche", desc: "Résumé hebdomadaire chaque dimanche à 18h", value: notifWeekly, set: setNotifWeekly },
              ].map(({ key, label, desc, value, set }) => (
                <label key={key} className="flex items-center justify-between cursor-pointer py-2.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-black">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                  <div
                    onClick={() => set(!value)}
                    className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer ${value ? "bg-black" : "bg-gray-200"}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${value ? "translate-x-5" : "translate-x-1"}`} />
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={prevStep} className="btn-ghost flex items-center gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Retour
              </button>
              <div className="flex-1 flex flex-col gap-2">
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="btn-primary w-full justify-center disabled:opacity-40"
                >
                  {loading ? "Finalisation…" : "Terminer"} <Check className="h-4 w-4" />
                </button>
                <button onClick={handleFinish} className="text-xs text-center text-gray-400 hover:text-black py-1">
                  Passer cette étape →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
