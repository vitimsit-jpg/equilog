"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import type { ProfileType, HorseIndexMode } from "@/lib/supabase/types";
import { Check, ArrowRight, ArrowLeft, ChevronRight, Plus, Trash2, Bell, ChevronDown } from "lucide-react";
import PushNotificationToggle from "@/components/settings/PushNotificationToggle";
import RideQuestionStep from "@/components/onboarding/RideQuestionStep";

// ─── Données statiques ──────────────────────────────────────────────────────

const PROFILES: { type: ProfileType; emoji: string; title: string; subtitle: string }[] = [
  { type: "loisir",      emoji: "🌿", title: "Je monte pour le plaisir",          subtitle: "Je suis propriétaire ou en demi-pension" },
  { type: "competition", emoji: "🏆", title: "Je fais des concours régulièrement", subtitle: "Licence FFE Compétition, 5 à 50 sorties/an" },
  { type: "pro",         emoji: "⭐", title: "Le cheval est mon activité pro",      subtitle: "Je vis du cheval : vente, cours, pension..." },
  { type: "gerant",      emoji: "🏘", title: "Je gère une structure équestre",      subtitle: "Centre équestre, écurie de propriétaires..." },
];

const MODE_VIE_OPTIONS: { mode: HorseIndexMode; emoji: string; label: string; desc: string }[] = [
  { mode: "IE",  emoji: "🌿", label: "Équilibre",    desc: "Pratique régulière, loisir ou club" },
  { mode: "IC",  emoji: "🏆", label: "Compétition",  desc: "Préparation et sorties en concours" },
  { mode: "ICr", emoji: "🌱", label: "Croissance",   desc: "Poulain ou jeune cheval en développement" },
  { mode: "IR",  emoji: "💊", label: "Convalescence",desc: "Blessure, arrêt ou repos médical" },
  { mode: "IS",  emoji: "🌸", label: "Retraite",     desc: "Cheval retraité ou à très faible activité" },
  { mode: "IP",  emoji: "🔄", label: "Rééducation",  desc: "Reprise progressive après blessure ou pause" },
];

const DISCIPLINES = ["CSO", "CCE", "Dressage", "Endurance", "TREC", "Équitation Western", "Hunter", "Autre"];

const GRAMMAGES = [0, 50, 100, 150, 200, 300, 400];

const TAILLE_OPTIONS = [
  { value: "moins_148", label: "< 1,48m" },
  { value: "148_160",   label: "1,48 – 1,60m" },
  { value: "160_170",   label: "1,60 – 1,70m" },
  { value: "plus_170",  label: "> 1,70m" },
] as const;

const REGIONS_FRANCE = [
  "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretagne",
  "Centre-Val de Loire", "Corse", "Grand Est", "Hauts-de-France",
  "Île-de-France", "Normandie", "Nouvelle-Aquitaine", "Occitanie",
  "Pays de la Loire", "Provence-Alpes-Côte d'Azur",
];

// ─── Types internes ─────────────────────────────────────────────────────────

type Couverture = { label: string; grammage: number; impermeable: boolean };

// ─── Helpers navigation ────────────────────────────────────────────────────

// Steps: 1=profil 2=modules-complémentaires 3=cheval 4=modules-app 5=trousseau 6=cavalier 7=notifs 8=success
function getSteps(profile: ProfileType): number[] {
  if (profile === "gerant") return [1, 6, 7]; // skip modules, cheval, trousseau, modules-app
  return [1, 2, 3, 4, 5, 6, 7];
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
  const [ridesHorse, setRidesHorse] = useState(true); // TRAV-19
  const [discipline, setDiscipline] = useState("");
  const [breed, setBreed] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [sexe, setSexe] = useState<"" | "hongre" | "jument" | "etalon">("");
  const [ecurie, setEcurie] = useState("");
  const [logement, setLogement] = useState<"" | "box" | "pre" | "box_paddock">("");
  const [tonte, setTonte] = useState<"" | "non_tondu" | "partielle" | "complete">("");
  const [horseTaille, setHorseTaille] = useState<"" | "moins_148" | "148_160" | "160_170" | "plus_170">("");
  const [horseRegion, setHorseRegion] = useState("");
  // Step 4 — modules app
  const [appModules, setAppModules] = useState<Record<string, boolean>>({
    journal_seances: true,
    communaute: true,
    budget: false,
    documents: false,
    planning: false,
    analyse_ia: false,
  });

  // Step 5 — trousseau
  const [trousseau, setTrousseau] = useState<Couverture[]>([]);
  const [newCouv, setNewCouv] = useState<{ grammage: string; impermeable: boolean }>({ grammage: "", impermeable: false });

  // Step 3 — toggle détails
  const [showHorseDetails, setShowHorseDetails] = useState(false);

  // Step 6 — profil cavalier
  const [riderNiveau, setRiderNiveau] = useState<"" | "debutant" | "amateur" | "confirme" | "pro">("");
  const [riderObjectif, setRiderObjectif] = useState<"" | "competition" | "progression" | "loisir" | "remise_en_forme">("");
  const [riderFrequence, setRiderFrequence] = useState<number | null>(null);
  const [riderDisciplines, setRiderDisciplines] = useState<string[]>([]);
  const [riderZones, setRiderZones] = useState<string[]>([]);
  const [riderAsymetrie, setRiderAsymetrie] = useState<"" | "droite" | "gauche" | "symetrique" | "ne_sais_pas">("");
  const [riderPathologies, setRiderPathologies] = useState("");
  const [riderSuiviCorps, setRiderSuiviCorps] = useState<Record<string, { actif: boolean; frequence?: string }>>({});
  const [riderActiviteTypes, setRiderActiviteTypes] = useState<string[]>([]);
  const [riderActiviteFrequence, setRiderActiviteFrequence] = useState("");
  const [riderObjectifsCavalier, setRiderObjectifsCavalier] = useState<string[]>([]);

  // Step 7 — notifs
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
      setStep(8); // success
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
      taille: horseTaille || null,
      region: horseRegion || null,
    }).select("id").single();

    if (error || !horse) {
      toast.error("Erreur lors de la création du cheval");
      setLoading(false);
      return;
    }
    setCreatedHorseId(horse.id);
    // TRAV-19 : enregistrer si l'utilisateur monte ce cheval
    await supabase.from("horse_user_roles").upsert({
      horse_id: horse.id,
      user_id: user.id,
      role: "owner",
      rides_horse: ridesHorse,
    }, { onConflict: "horse_id,user_id" });
    await supabase.from("users").update({ onboarding_step: 3 }).eq("id", user.id);
    nextStep();
    setLoading(false);
  };

  const handleStep4ModulesNext = async () => {
    if (userId) {
      await supabase.from("users").update({
        user_modules: appModules,
        onboarding_step: 4,
      }).eq("id", userId);
    }
    nextStep();
  };

  const handleStep4Next = async () => {
    if (createdHorseId && trousseau.length > 0) {
      await supabase.from("horses").update({ trousseau }).eq("id", createdHorseId);
    }
    if (userId) await supabase.from("users").update({ onboarding_step: 5 }).eq("id", userId);
    nextStep();
  };

  const handleStep5Next = async () => {
    const hasSuivi = Object.keys(riderSuiviCorps).length > 0;
    if (userId && (riderNiveau || riderObjectif || riderFrequence || riderDisciplines.length > 0 || riderZones.length > 0 || riderAsymetrie || riderPathologies.trim() || hasSuivi)) {
      await supabase.from("users").update({
        rider_niveau: riderNiveau || null,
        rider_objectif: riderObjectif || null,
        rider_frequence: riderFrequence,
        rider_disciplines: riderDisciplines.length > 0 ? riderDisciplines : null,
        rider_zones_douloureuses: riderZones.length > 0 ? riderZones : null,
        rider_asymetrie: riderAsymetrie || null,
        rider_pathologies: riderPathologies.trim() || null,
        rider_suivi_corps: hasSuivi ? riderSuiviCorps : null,
        rider_activite_types: riderActiviteTypes.length > 0 ? riderActiviteTypes : null,
        rider_activite_frequence: riderActiviteFrequence || null,
        rider_objectifs_cavalier: riderObjectifsCavalier.length > 0 ? riderObjectifsCavalier : null,
        onboarding_step: 6,
      }).eq("id", userId);
    }
    nextStep();
  };

  const handleFinish = async () => {
    if (!userId) { router.push("/dashboard"); return; }
    setLoading(true);
    await supabase.from("users").update({
      notify_health_reminders: notifHealth,
      notify_weekly_summary: notifWeekly,
      onboarding_step: 7,
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
              : step > s || (step === 7) ? "bg-green-500 text-white"
              : "bg-gray-100 text-gray-400"
          }`}>
            {(step > s || step === 7) ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 h-0.5 transition-all ${(step > s || step === 7) ? "bg-green-500" : "bg-gray-100"}`} />
          )}
        </div>
      ))}
    </div>
  );

  const isDisciplineRequired = selectedProfile === "competition" || selectedProfile === "pro";
  const isDisciplineVisible = selectedProfile !== "loisir";

  // ─── Step 8 : Succès ───────────────────────────────────────────────────

  if (step === 8) {
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

  // ─── Steps 1–7 ─────────────────────────────────────────────────────────

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
                      className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border-2 text-left transition-all ${
                        modeVie === m.mode
                          ? "border-orange bg-orange-light"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{m.emoji}</span>
                        <span className={`text-xs font-semibold ${modeVie === m.mode ? "text-orange" : "text-gray-700"}`}>{m.label}</span>
                      </div>
                      <span className={`text-2xs leading-tight ${modeVie === m.mode ? "text-orange/70" : "text-gray-400"}`}>{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* TRAV-19 : Montez-vous ce cheval ? */}
              <RideQuestionStep value={ridesHorse} onChange={setRidesHorse} />

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

                  {/* Taille */}
                  <div>
                    <label className="label">Taille</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {TAILLE_OPTIONS.map((t) => (
                        <button key={t.value} type="button"
                          onClick={() => setHorseTaille(horseTaille === t.value ? "" : t.value)}
                          className={`px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                            horseTaille === t.value ? "border-black bg-black text-white" : "border-gray-200 hover:border-gray-300 text-gray-700"
                          }`}
                        >{t.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Région */}
                  <div>
                    <label className="label">Région</label>
                    <select
                      value={horseRegion}
                      onChange={(e) => setHorseRegion(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black mt-1 bg-white"
                    >
                      <option value="">Sélectionner une région…</option>
                      {REGIONS_FRANCE.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
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

        {/* ── Step 4 : Modules app ── */}
        {step === 4 && (
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">⚙️</span>
              </div>
              <h1 className="text-xl font-bold text-black">Personnalisez votre app</h1>
              <p className="text-sm text-gray-400 mt-1">Activez les modules dont vous avez besoin. Tout est modifiable plus tard.</p>
            </div>

            <div className="space-y-3 mb-6">
              {[
                { key: "journal_seances", emoji: "🏇", label: "Journal de séances", desc: "Enregistrez vos séances et suivez la progression", defaultOn: true },
                { key: "communaute",      emoji: "👥", label: "Communauté",          desc: "Échangez avec d'autres cavaliers de votre écurie", defaultOn: true },
                { key: "budget",          emoji: "💰", label: "Budget",              desc: "Suivez les dépenses liées à votre cheval", defaultOn: false },
                { key: "documents",       emoji: "📄", label: "Documents",           desc: "Gérez passeports, contrats et fichiers", defaultOn: false },
                { key: "planning",        emoji: "📅", label: "Planning & Programme",desc: "Planifiez vos séances et votre programme", defaultOn: false },
                { key: "analyse_ia",      emoji: "🤖", label: "Analyse IA",          desc: "Analysez vos vidéos avec l'intelligence artificielle", defaultOn: false },
              ].map(({ key, emoji, label, desc }) => {
                const active = appModules[key] ?? false;
                return (
                  <div key={key} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl flex-shrink-0">{emoji}</span>
                      <div>
                        <p className="text-sm font-semibold text-black">{label}</p>
                        <p className="text-xs text-gray-400">{desc}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAppModules((prev) => ({ ...prev, [key]: !prev[key] }))}
                      className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${active ? "bg-black" : "bg-gray-200"}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${active ? "translate-x-5" : "translate-x-1"}`} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button onClick={prevStep} className="btn-ghost flex items-center gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Retour
              </button>
              <div className="flex-1 flex flex-col gap-2">
                <button onClick={handleStep4ModulesNext} className="btn-primary w-full justify-center">
                  Continuer <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => nextStep()} className="text-xs text-center text-gray-400 hover:text-black py-1">
                  Passer cette étape →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 5 : Trousseau ── */}
        {step === 5 && (
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

        {/* ── Step 6 : Profil cavalier ── */}
        {step === 6 && (
          <div>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🏇</span>
              </div>
              <h1 className="text-xl font-bold text-black">Votre profil cavalier</h1>
              <p className="text-sm text-gray-400 mt-1">Aide l&apos;IA à personnaliser ses recommandations pour vous.</p>
            </div>

            <div className="space-y-5 mb-6">
              {/* Niveau */}
              <div>
                <label className="label mb-2">Mon niveau</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { v: "debutant", l: "Débutant", e: "🌱" },
                    { v: "amateur",  l: "Amateur",  e: "🐴" },
                    { v: "confirme", l: "Confirmé", e: "⭐" },
                    { v: "pro",      l: "Pro",      e: "🏆" },
                  ] as const).map(({ v, l, e }) => (
                    <button key={v} type="button" onClick={() => setRiderNiveau(riderNiveau === v ? "" : v)}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                        riderNiveau === v ? "border-black bg-black text-white" : "border-gray-200 hover:border-gray-300 text-gray-700"
                      }`}
                    >
                      <span>{e}</span>
                      <span className="text-sm font-semibold">{l}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Objectif */}
              <div>
                <label className="label mb-2">Mon objectif principal</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { v: "loisir",           l: "Loisir",          e: "🌿" },
                    { v: "progression",      l: "Progresser",      e: "📈" },
                    { v: "competition",      l: "Compétition",     e: "🏆" },
                    { v: "remise_en_forme",  l: "Remise en forme", e: "💪" },
                  ] as const).map(({ v, l, e }) => (
                    <button key={v} type="button" onClick={() => setRiderObjectif(riderObjectif === v ? "" : v)}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                        riderObjectif === v ? "border-black bg-black text-white" : "border-gray-200 hover:border-gray-300 text-gray-700"
                      }`}
                    >
                      <span>{e}</span>
                      <span className="text-sm font-semibold">{l}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Fréquence */}
              <div>
                <label className="label mb-2">Je monte en moyenne</label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setRiderFrequence(riderFrequence === n ? null : n)}
                      className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                        riderFrequence === n ? "border-black bg-black text-white" : "border-gray-200 hover:border-gray-300 text-gray-700"
                      }`}
                    >
                      {n === 5 ? "5×+" : `${n}×`}/sem
                    </button>
                  ))}
                </div>
              </div>

              {/* Disciplines */}
              <div>
                <label className="label mb-2">Mes disciplines <span className="font-normal text-gray-400 text-xs">(plusieurs possibles)</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {DISCIPLINES.map((d) => (
                    <button key={d} type="button"
                      onClick={() => setRiderDisciplines((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])}
                      className={`p-2.5 rounded-xl border-2 text-left text-xs font-medium transition-all ${
                        riderDisciplines.includes(d) ? "border-black bg-black text-white" : "border-gray-200 hover:border-gray-300 text-gray-700"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Douleurs & pathologies */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm font-bold text-black mb-0.5">Douleurs & pathologies chroniques</p>
                <p className="text-xs text-gray-400 mb-4">Optionnel — aide l&apos;IA à personnaliser ses conseils.</p>

                <div className="mb-4">
                  <label className="label mb-2">Zones douloureuses habituelles</label>
                  <div className="flex flex-wrap gap-2">
                    {["Lombaires (bas du dos)", "Nuque / cervicales", "Épaules", "Milieu du dos", "Bassin / sacro-iliaque", "Hanches / adducteurs", "Genoux", "Poignets", "Chevilles", "Autre"].map((z) => (
                      <button key={z} type="button"
                        onClick={() => setRiderZones((prev) => prev.includes(z) ? prev.filter((x) => x !== z) : [...prev, z])}
                        className={`px-3 py-1.5 rounded-xl border-2 text-xs font-medium transition-all ${
                          riderZones.includes(z) ? "border-black bg-black text-white" : "border-gray-200 hover:border-gray-300 text-gray-700"
                        }`}
                      >
                        {z}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-3">
                  <label className="label mb-2">Asymétrie / raideur</label>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { v: "droite",      l: "Plus raide à droite" },
                      { v: "gauche",      l: "Plus raide à gauche" },
                      { v: "symetrique",  l: "Plutôt symétrique" },
                      { v: "ne_sais_pas", l: "Je ne sais pas" },
                    ] as const).map(({ v, l }) => (
                      <button key={v} type="button"
                        onClick={() => setRiderAsymetrie(riderAsymetrie === v ? "" : v)}
                        className={`px-3 py-1.5 rounded-xl border-2 text-xs font-medium transition-all ${
                          riderAsymetrie === v ? "border-black bg-black text-white" : "border-gray-200 hover:border-gray-300 text-gray-700"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                    La raideur d&apos;un côté se ressent souvent dans les transitions, les cercles ou les appuis en étriers.
                  </p>
                </div>

                <div>
                  <label className="label mb-1">Pathologies connues <span className="font-normal text-gray-400">(optionnel)</span></label>
                  <textarea
                    value={riderPathologies}
                    onChange={(e) => setRiderPathologies(e.target.value)}
                    placeholder="Ex : scoliose, hernie discale, tendinite chronique…"
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black resize-none mt-1"
                  />
                </div>
              </div>

              {/* Suivi corps */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm font-bold text-black mb-0.5">Suivi corps</p>
                <p className="text-xs text-gray-400 mb-4">Praticiens que vous consultez régulièrement.</p>
                <div className="space-y-3">
                  {([
                    { key: "kine", label: "Kinésithérapeute" },
                    { key: "osteo", label: "Ostéopathe" },
                    { key: "podologue", label: "Podologue" },
                    { key: "coach", label: "Préparateur physique / Coach sportif" },
                  ] as const).map(({ key, label }) => {
                    const entry = riderSuiviCorps[key];
                    const actif = entry?.actif ?? false;
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-black">{label}</span>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button type="button"
                              onClick={() => setRiderSuiviCorps((prev) => ({ ...prev, [key]: { actif: true, frequence: prev[key]?.frequence } }))}
                              className={`px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all ${actif ? "border-black bg-black text-white" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                            >Oui</button>
                            <button type="button"
                              onClick={() => setRiderSuiviCorps((prev) => { const next = { ...prev }; delete next[key]; return next; })}
                              className={`px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all ${!actif && key in riderSuiviCorps ? "border-gray-400 bg-gray-100 text-gray-600" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                            >Non</button>
                          </div>
                        </div>
                        {actif && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {([
                              { value: "ponctuel", label: "Ponctuel" },
                              { value: "2_3_semaines", label: "Toutes les 2-3 semaines" },
                              { value: "mensuel", label: "Mensuel" },
                              { value: "hebdomadaire", label: "Hebdomadaire" },
                            ] as const).map(({ value, label: flabel }) => (
                              <button key={value} type="button"
                                onClick={() => setRiderSuiviCorps((prev) => ({ ...prev, [key]: { actif: true, frequence: value } }))}
                                className={`px-3 py-1.5 rounded-xl border-2 text-xs font-medium transition-all ${
                                  entry?.frequence === value ? "border-black bg-black text-white" : "border-gray-200 text-gray-600 hover:border-gray-300"
                                }`}
                              >{flabel}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Forme & activité physique */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm font-bold text-black mb-0.5">Forme & activité physique hors équitation</p>
                <p className="text-xs text-gray-400 mb-4">Pour mieux calibrer vos recommandations de récupération.</p>

                <div className="mb-4">
                  <label className="label mb-2">Type d&apos;activité</label>
                  <div className="flex flex-wrap gap-2">
                    {["Yoga", "Pilates", "Musculation / Renforcement", "Running", "Natation", "Vélo", "Sports collectifs", "Aucune", "Autre"].map((a) => (
                      <button key={a} type="button"
                        onClick={() => setRiderActiviteTypes((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a])}
                        className={`px-3 py-1.5 rounded-xl border-2 text-xs font-medium transition-all ${
                          riderActiviteTypes.includes(a) ? "border-black bg-black text-white" : "border-gray-200 hover:border-gray-300 text-gray-700"
                        }`}
                      >{a}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label mb-2">Fréquence</label>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { value: "jamais",       label: "Jamais" },
                      { value: "1x_semaine",   label: "1× par semaine" },
                      { value: "2_3x_semaine", label: "2-3× par semaine" },
                      { value: "4x_plus",      label: "4× et plus" },
                    ] as const).map(({ value, label }) => (
                      <button key={value} type="button"
                        onClick={() => setRiderActiviteFrequence(riderActiviteFrequence === value ? "" : value)}
                        className={`px-3 py-1.5 rounded-xl border-2 text-xs font-medium transition-all ${
                          riderActiviteFrequence === value ? "border-black bg-black text-white" : "border-gray-200 hover:border-gray-300 text-gray-700"
                        }`}
                      >{label}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Objectifs cavalier */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm font-bold text-black mb-0.5">Objectifs cavalier</p>
                <p className="text-xs text-gray-400 mb-3">Plusieurs choix possibles.</p>
                <div className="flex flex-wrap gap-2">
                  {["Progresser techniquement", "Préparer des compétitions", "Retrouver de la confiance", "Améliorer ma condition physique", "Pratiquer en loisir apaisé", "Travailler ma relation avec mon cheval", "Autre"].map((o) => (
                    <button key={o} type="button"
                      onClick={() => setRiderObjectifsCavalier((prev) => prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o])}
                      className={`px-3 py-1.5 rounded-xl border-2 text-xs font-medium transition-all ${
                        riderObjectifsCavalier.includes(o) ? "border-black bg-black text-white" : "border-gray-200 hover:border-gray-300 text-gray-700"
                      }`}
                    >{o}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={prevStep} className="btn-ghost flex items-center gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Retour
              </button>
              <div className="flex-1 flex flex-col gap-2">
                <button onClick={handleStep5Next} className="btn-primary w-full justify-center">
                  Continuer <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => nextStep()} className="text-xs text-center text-gray-400 hover:text-black py-1">
                  Passer cette étape →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 7 : Notifications ── */}
        {step === 7 && (
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
