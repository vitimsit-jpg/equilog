"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import type { UserType } from "@/lib/supabase/types";
import { Check, ArrowRight, ArrowLeft, ChevronRight } from "lucide-react";
import { format, addDays } from "date-fns";

// ─── Données statiques ─────────────────────────────────────────────────────

const PROFILES: { type: UserType; emoji: string; title: string; subtitle: string }[] = [
  { type: "loisir",          emoji: "🌿", title: "Cavalier loisir",        subtitle: "Je monte pour le plaisir" },
  { type: "competition",     emoji: "🏆", title: "Compétiteur amateur",     subtitle: "Je concours régulièrement" },
  { type: "pro",             emoji: "⭐", title: "Cavalier professionnel",  subtitle: "Haut niveau / semi-pro" },
  { type: "gerant_cavalier", emoji: "🏠", title: "Gérant + cavalier",       subtitle: "Écurie et compétition" },
  { type: "coach",           emoji: "🎯", title: "Coach indépendant",       subtitle: "J'entraîne des cavaliers" },
  { type: "gerant_ecurie",   emoji: "🏢", title: "Gérant d'écurie",         subtitle: "Gestion de structure" },
];

const DISCIPLINES = ["CSO", "Dressage", "CCE", "Endurance", "Attelage", "Voltige", "TREC", "Hunter", "Équitation Western", "Autre"];

const CARE_TYPES = [
  { key: "vaccin",   label: "Dernier vaccin",   interval: 182, placeholder: "jj/mm/aaaa" },
  { key: "vermifuge",label: "Dernier vermifuge", interval: 90,  placeholder: "jj/mm/aaaa" },
  { key: "ferrage",  label: "Dernier parage",    interval: 35,  placeholder: "jj/mm/aaaa" },
  { key: "dentiste", label: "Dernier dentiste",  interval: 365, placeholder: "jj/mm/aaaa" },
] as const;

const TOTAL_STEPS = 5;

// ─── Composant ─────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const [step, setStep] = useState(1);

  // Guard: already onboarded → redirect to dashboard
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("users").select("user_type").eq("id", user.id).single();
      if (data?.user_type) {
        const { count } = await supabase.from("horses").select("id", { count: "exact", head: true }).eq("user_id", user.id);
        if ((count ?? 0) > 0) router.replace("/dashboard");
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [loading, setLoading] = useState(false);
  const [createdHorseId, setCreatedHorseId] = useState<string | null>(null);

  // Step 1 — profil
  const [selectedProfile, setSelectedProfile] = useState<UserType>("loisir");

  // Step 2 — cheval
  const [horseName, setHorseName] = useState("");
  const [breed, setBreed] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [sexe, setSexe] = useState<"" | "hongre" | "jument" | "etalon">("");
  const [birthYear, setBirthYear] = useState("");

  // Step 3 — soins de base
  const [careDates, setCareDates] = useState<Record<string, string>>({
    vaccin: "", vermifuge: "", ferrage: "", dentiste: "",
  });

  // Step 4 — objectifs
  const [objectif, setObjectif] = useState("");
  const [niveau, setNiveau] = useState("");

  // ── Navigation ──

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  // ── Sauvegarde step 2 (crée le cheval) ──

  const saveHorse = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    if (!horseName.trim()) return null;

    const { data, error } = await supabase.from("horses").insert({
      user_id: user.id,
      name: horseName.trim(),
      breed: breed.trim() || null,
      discipline: discipline || null,
      sexe: sexe || null,
      birth_year: birthYear ? parseInt(birthYear) : null,
    }).select("id").single();

    if (error) { toast.error("Erreur lors de la création du cheval"); return null; }
    return data.id;
  };

  // ── Sauvegarde globale (à la fin step 4) ──

  const handleFinish = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // Profil utilisateur
      await supabase.from("users").update({ user_type: selectedProfile }).eq("id", user.id);

      // Cheval (si pas encore créé)
      let horseId = createdHorseId;
      if (!horseId && horseName.trim()) {
        horseId = await saveHorse();
        if (horseId) setCreatedHorseId(horseId);
      }

      // Soins de base
      if (horseId) {
        const careInserts = CARE_TYPES
          .filter((c) => careDates[c.key])
          .map((c) => ({
            horse_id: horseId,
            type: c.key,
            date: careDates[c.key],
            next_date: format(addDays(new Date(careDates[c.key]), c.interval), "yyyy-MM-dd"),
          }));
        if (careInserts.length) await supabase.from("health_records").insert(careInserts);

        // Objectifs
        if (objectif || niveau) {
          await supabase.from("horses").update({
            objectif_saison: objectif || null,
            niveau: niveau || null,
          }).eq("id", horseId);
        }
      }

      next(); // → step 5 (succès)
    } catch {
      toast.error("Une erreur est survenue");
    }
    setLoading(false);
  };

  const handleStep2Next = async () => {
    if (!horseName.trim()) { next(); return; } // passer sans cheval
    setLoading(true);
    const id = await saveHorse();
    if (id) { setCreatedHorseId(id); next(); }
    setLoading(false);
  };

  // ─── Barre de progression ─────────────────────────────────────────────────

  const ProgressBar = () => (
    <div className="flex items-center justify-center gap-1.5 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
        const s = i + 1;
        return (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step === s ? "bg-black text-white scale-110"
                : step > s ? "bg-green-500 text-white"
                : "bg-gray-100 text-gray-400"
            }`}>
              {step > s ? <Check className="h-3.5 w-3.5" /> : s}
            </div>
            {s < TOTAL_STEPS && (
              <div className={`w-8 h-0.5 transition-all ${step > s ? "bg-green-500" : "bg-gray-100"}`} />
            )}
          </div>
        );
      })}
    </div>
  );

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

  // ─── Step 5 : Succès ──────────────────────────────────────────────────────

  if (step === 5) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-full bg-black text-white flex items-center justify-center mx-auto mb-6 animate-fade-in">
            <span className="text-4xl">🐴</span>
          </div>
          <h1 className="text-2xl font-black text-black mb-2">C&apos;est parti !</h1>
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

  // ─── Steps 1–4 ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <Logo />
        <ProgressBar />

        {/* ── Step 1 : Profil ── */}
        {step === 1 && (
          <div>
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-black">Quel est votre profil ?</h1>
              <p className="text-sm text-gray-400 mt-1">Votre expérience sera adaptée à vos besoins.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
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
            <button onClick={next} className="btn-primary w-full justify-center">
              Continuer <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Step 2 : Cheval ── */}
        {step === 2 && (
          <div>
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-black">Votre premier cheval</h1>
              <p className="text-sm text-gray-400 mt-1">Vous pourrez en ajouter d&apos;autres plus tard.</p>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="label">Nom <span className="text-orange">*</span></label>
                <input
                  type="text"
                  value={horseName}
                  onChange={(e) => setHorseName(e.target.value)}
                  placeholder="Ex : Dynamite, Sultan, Roxane…"
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black mt-1"
                />
              </div>
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
              <div>
                <label className="label">Discipline <span className="text-gray-400 font-normal text-xs">(optionnel)</span></label>
                <select
                  value={discipline}
                  onChange={(e) => setDiscipline(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black mt-1 bg-white"
                >
                  <option value="">Sélectionner…</option>
                  {DISCIPLINES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Sexe <span className="text-gray-400 font-normal text-xs">(optionnel)</span></label>
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
            </div>
            <p className="text-center text-xs text-gray-400 mb-4">
              Pas de cheval pour l&apos;instant ?{" "}
              <button onClick={next} className="underline text-gray-500 hover:text-black">Passer cette étape →</button>
            </p>
            <div className="flex gap-3">
              <button onClick={prev} className="btn-ghost flex items-center gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Retour
              </button>
              <button
                onClick={handleStep2Next}
                disabled={loading || !horseName.trim()}
                className="btn-primary flex-1 justify-center disabled:opacity-40"
              >
                {loading ? "Enregistrement…" : "Continuer"} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3 : Soins de base ── */}
        {step === 3 && (
          <div>
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-black">Soins récents</h1>
              <p className="text-sm text-gray-400 mt-1">
                Renseignez les dernières dates connues pour calculer le score de santé.
              </p>
            </div>
            <div className="space-y-3 mb-6">
              {CARE_TYPES.map((c) => (
                <div key={c.key} className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700 w-36 flex-shrink-0">{c.label}</label>
                  <input
                    type="date"
                    value={careDates[c.key]}
                    onChange={(e) => setCareDates({ ...careDates, [c.key]: e.target.value })}
                    max={today}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center mb-4">
              Ces informations sont facultatives — vous pourrez les compléter dans le carnet de santé.
            </p>
            <div className="flex gap-3">
              <button onClick={prev} className="btn-ghost flex items-center gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Retour
              </button>
              <button onClick={next} className="btn-primary flex-1 justify-center">
                Continuer <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4 : Objectifs ── */}
        {step === 4 && (
          <div>
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-black">Objectifs de saison</h1>
              <p className="text-sm text-gray-400 mt-1">Aidez l&apos;IA à personnaliser ses conseils.</p>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="label">Objectif de saison</label>
                <input
                  type="text"
                  value={objectif}
                  onChange={(e) => setObjectif(e.target.value)}
                  placeholder="Ex : Monter en Pro 1, garder la forme, qualifier pour les Régionaux…"
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black mt-1"
                />
              </div>
              <div>
                <label className="label">Niveau actuel</label>
                <input
                  type="text"
                  value={niveau}
                  onChange={(e) => setNiveau(e.target.value)}
                  placeholder="Ex : Amateur 5, Club 3, Pro 2…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black mt-1"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center mb-4">
              Champs facultatifs — modifiables à tout moment dans le profil du cheval.
            </p>
            <div className="flex gap-3">
              <button onClick={prev} className="btn-ghost flex items-center gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Retour
              </button>
              <button
                onClick={handleFinish}
                disabled={loading}
                className="btn-primary flex-1 justify-center disabled:opacity-40"
              >
                {loading ? "Enregistrement…" : "Terminer et accéder à l'app"} <Check className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
