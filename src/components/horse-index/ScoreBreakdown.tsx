import Link from "next/link";
import type { ScoreBreakdown, HorseIndexMode, HorseScore } from "@/lib/supabase/types";
import { MODE_WEIGHTS } from "@/lib/horse-index/calculator";

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdown;
  horseId?: string;
  scores?: HorseScore[]; // for trend
}

const MODE_LABELS: Record<HorseIndexMode, { label: string; fullLabel: string }> = {
  IC:  { label: "Compétition",    fullLabel: "Indice Compétition" },
  IE:  { label: "Loisir",         fullLabel: "Indice Équilibre" },
  IP:  { label: "Semi-actif",     fullLabel: "Indice Plaisir" },
  IR:  { label: "Convalescence",  fullLabel: "Indice Rétablissement" },
  IS:  { label: "Retraite",       fullLabel: "Indice Sérénité" },
  ICr: { label: "Poulain",        fullLabel: "Indice Croissance" },
};

// Visible pillars only — Suivi proprio is NEVER shown separately (HI-11)
const VISIBLE_PILLARS = [
  { key: "sante_score" as const, label: "Santé",    icon: "❤️", weightKey: "sante" as const,    healthLink: true },
  { key: "bienetre"    as const, label: "Bien-être", icon: "🌿", weightKey: "bienetre" as const },
  { key: "activite"    as const, label: "Activité",  icon: "🏇", weightKey: "activite" as const },
];

const PILLAR_DESC: Record<string, string> = {
  sante_score: "Soins à jour (vaccin, vermifuge, parage, dentiste) · Absence d'alerte vétérinaire urgente · Régularité du suivi",
  bienetre:    "Ressenti noté en séance (feeling 1-5) · Équilibre repos / travail (idéal 30-55 % de repos) · Régularité des sorties (au moins 1/sem)",
};

const ACTIVITE_DESC: Record<HorseIndexMode, string> = {
  IC:  "Régularité des séances (cible 4/sem) · Progression de l'intensité et du feeling · Bonus résultats en concours",
  IE:  "Régularité des montées (cible 1-2/sem) · Progression de l'intensité et du feeling sur 6 mois",
  IP:  "1 contact par semaine = bon score · La régularité prime sur l'intensité",
  IR:  "Cible : 1 à 3 séances légères par semaine · Suractivité aussi pénalisée que sous-activité",
  IS:  "Présence de contacts réguliers dans la fenêtre · Aucun travail monté attendu",
  ICr: "Contacts réguliers valorisés · Travail monté non attendu pour un poulain",
};

function computeTrend(scores: HorseScore[]): "up" | "down" | "stable" | null {
  // Sort by computed_at ascending
  const sorted = [...scores].sort(
    (a, b) => new Date(a.computed_at).getTime() - new Date(b.computed_at).getTime()
  );
  const last7 = sorted.filter((s) => {
    const diffMs = Date.now() - new Date(s.computed_at).getTime();
    return diffMs <= 7 * 24 * 60 * 60 * 1000;
  });
  if (last7.length < 2) return null;
  const first = last7[0].score;
  const last  = last7[last7.length - 1].score;
  const diff  = last - first;
  if (diff > 2)  return "up";
  if (diff < -2) return "down";
  return "stable";
}

// Legacy v1 pillars
const V1_PILLARS = [
  { key: "regularite",   label: "Régularité d'entraînement", max: 25, icon: "📅" },
  { key: "progression",  label: "Progression & performance",  max: 25, icon: "📈" },
  { key: "sante",        label: "État de santé",              max: 20, icon: "❤️" },
  { key: "recuperation", label: "Récupération & bien-être",   max: 20, icon: "😴" },
  { key: "wearables",    label: "Données wearables",          max: 10, icon: "⌚" },
];

export default function ScoreBreakdownComponent({ breakdown, horseId, scores }: ScoreBreakdownProps) {
  const isV2 = breakdown.version === 2;

  if (isV2) {
    const mode = (breakdown.mode ?? "IE") as HorseIndexMode;
    const modeInfo = MODE_LABELS[mode];
    const weights = MODE_WEIGHTS[mode];
    const trend = scores ? computeTrend(scores) : null;

    return (
      <div className="space-y-4">
        {/* Mode + trend ───────────────────────────────── */}
        <div className="flex items-center justify-between p-2.5 bg-beige rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-orange bg-orange-light px-1.5 py-0.5 rounded">
              {mode}
            </span>
            <span className="text-xs font-semibold text-black">{modeInfo.fullLabel}</span>
          </div>
          {trend && (
            <span className={`text-sm font-bold ${
              trend === "up" ? "text-success" : trend === "down" ? "text-danger" : "text-gray-400"
            }`}>
              {trend === "up" ? "↗" : trend === "down" ? "↘" : "→"}
            </span>
          )}
        </div>

        {/* Pilliers visibles — Suivi proprio JAMAIS affiché séparément ─────── */}
        <div className="space-y-3">
          {VISIBLE_PILLARS.map((pillar) => {
            const rawScore = breakdown[pillar.key as keyof ScoreBreakdown];
            const pillarScore = typeof rawScore === "number" ? rawScore : null;
            const isNull = pillarScore === null;

            // Format x/y : earned = round(pillarScore/100 * weight * 100), max = weight * 100
            const maxPts = Math.round(weights[pillar.weightKey] * 100);
            const earnedPts = pillarScore !== null ? Math.round((pillarScore / 100) * maxPts) : null;

            return (
              <div key={pillar.key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{pillar.icon}</span>
                    <span className="text-xs font-medium text-gray-700">{pillar.label}</span>
                    {isNull && (
                      <span className="text-2xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        Pas encore de données
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-black">
                    {isNull ? `—/${maxPts}` : `${earnedPts}/${maxPts}`}
                  </span>
                </div>

                {pillar.key === "sante_score" && (
                  <p className="text-2xs text-gray-400 mb-1.5 leading-relaxed">
                    {PILLAR_DESC.sante_score}
                    {horseId && (
                      <>{" · "}<Link href={`/horses/${horseId}/health`} className="underline hover:text-gray-600">Voir le carnet →</Link></>
                    )}
                  </p>
                )}
                {pillar.key === "bienetre" && (
                  <p className="text-2xs text-gray-400 mb-1.5 leading-relaxed">
                    {PILLAR_DESC.bienetre}
                  </p>
                )}
                {pillar.key === "activite" && (
                  <p className="text-2xs text-gray-400 mb-1.5 leading-relaxed">
                    {ACTIVITE_DESC[mode]}
                  </p>
                )}

                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  {!isNull && (
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${pillarScore}%`,
                        backgroundColor:
                          pillarScore >= 80 ? "#16A34A"
                          : pillarScore >= 60 ? "#E8440A"
                          : pillarScore >= 40 ? "#D97706"
                          : "#DC2626",
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Legacy v1 display ──────────────────────────────────────────────────────
  const estimatedWeekly = Math.round((((breakdown.regularite ?? 0) / 25) * 4) * 10) / 10;

  return (
    <div className="space-y-3">
      {V1_PILLARS.map((comp) => {
        const value = (breakdown[comp.key as keyof ScoreBreakdown] as number) ?? 0;
        const pct = Math.round((value / comp.max) * 100);
        const isNA = comp.key === "wearables" && !breakdown.has_wearables;

        return (
          <div key={comp.key}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">{comp.icon}</span>
                <span className="text-xs font-medium text-gray-700">{comp.label}</span>
                {isNA && (
                  <span className="text-2xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    Bientôt disponible
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-black">
                {isNA ? "—" : `${value}/${comp.max}`}
              </span>
            </div>

            {comp.key === "regularite" && (
              <p className="text-2xs text-gray-400 mb-1.5">
                ~{estimatedWeekly} séance{estimatedWeekly !== 1 ? "s" : ""}/sem · Objectif : 4/sem sur 30 jours
              </p>
            )}
            {comp.key === "sante" && (
              <p className="text-2xs text-gray-400 mb-1.5">
                Basé sur vaccin, vermifuge, parage, dentiste.{" "}
                {horseId && (
                  <Link href={`/horses/${horseId}/health`} className="underline hover:text-gray-600">
                    Voir le carnet →
                  </Link>
                )}
              </p>
            )}

            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              {!isNA && (
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    backgroundColor:
                      pct >= 80 ? "#16A34A" : pct >= 60 ? "#E8440A" : pct >= 40 ? "#D97706" : "#DC2626",
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
