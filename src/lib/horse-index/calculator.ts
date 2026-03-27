import { differenceInDays, parseISO } from "date-fns";
import type {
  TrainingSession,
  HealthRecord,
  Competition,
  WearableData,
  ScoreBreakdown,
  HorseIndexMode,
} from "@/lib/supabase/types";

// ─── Fenêtre de calcul par mode (HI-01) ──────────────────────────────────────
export const WINDOW_DAYS: Record<HorseIndexMode, number> = {
  IC:  30,
  IE:  30,
  IP:  45,
  IR:  90,
  IS:  90,
  ICr: 180,
};

// ─── Table de pondération (HI-07 — TRAV-18 §4) ───────────────────────────────
// Mapping spec → pilliers : Régularité+Concours → activite | Alimentation → suivi_proprio
// Activité = 0 pour IR (MASQUÉ) ; Concours masqué pour IS/ICr (géré dans computeActivite)
export const MODE_WEIGHTS: Record<HorseIndexMode, {
  sante: number;
  bienetre: number;
  activite: number;
  suivi_proprio: number;
}> = {
  IC:  { sante: 0.20, bienetre: 0.20, activite: 0.45, suivi_proprio: 0.15 },
  IE:  { sante: 0.20, bienetre: 0.20, activite: 0.45, suivi_proprio: 0.15 },
  IP:  { sante: 0.45, bienetre: 0.35, activite: 0.15, suivi_proprio: 0.05 },
  IR:  { sante: 0.50, bienetre: 0.25, activite: 0.00, suivi_proprio: 0.25 }, // activite MASQUÉ
  IS:  { sante: 0.40, bienetre: 0.20, activite: 0.15, suivi_proprio: 0.25 },
  ICr: { sante: 0.30, bienetre: 0.25, activite: 0.25, suivi_proprio: 0.20 },
};

export interface HorseData {
  trainingSessions: TrainingSession[];
  healthRecords: HealthRecord[];
  competitions: Competition[];
  wearableData: WearableData[];
  horseProfile?: {
    breed?: string | null;
    birth_year?: number | null;
    conditions_vie?: string | null;
    ecurie?: string | null;
    trousseau?: unknown[] | null;
  };
}

export function calculateHorseIndex(
  data: HorseData,
  mode: HorseIndexMode = "IE",
): ScoreBreakdown {
  const now = new Date();
  const hasWearables = data.wearableData.length > 0;
  const windowDays = WINDOW_DAYS[mode];
  const weights = MODE_WEIGHTS[mode];

  // ── Piliers (0–100 chacun, null = pas de données = mode Incomplet) ─────────
  const sante_score  = computeSante(data.healthRecords, now);
  const bienetre     = computeBienetre(data.trainingSessions, now, windowDays);
  const activite     = computeActivite(data.trainingSessions, data.competitions, now, mode, windowDays);
  const suivi_proprio = weights.suivi_proprio > 0
    ? computeSuiviProprio(data, now)
    : null; // Non calculé si poids = 0

  // ── Score composite ────────────────────────────────────────────────────────
  type PillarKey = keyof typeof weights;
  const pillars: Array<{ key: PillarKey; score: number | null; weight: number }> = [
    { key: "sante",         score: sante_score,    weight: weights.sante },
    { key: "bienetre",      score: bienetre,        weight: weights.bienetre },
    { key: "activite",      score: activite,        weight: weights.activite },
    { key: "suivi_proprio", score: suivi_proprio,   weight: weights.suivi_proprio },
  ];

  const available = pillars.filter((p) => p.score !== null && p.weight > 0);
  let total = 0;

  if (available.length > 0) {
    const totalW = available.reduce((s, p) => s + p.weight, 0);
    for (const p of available) {
      total += (p.score as number) * (p.weight / totalW);
    }
  }

  return {
    version: 2,
    mode,
    sante_score,
    bienetre,
    activite,
    suivi_proprio,
    total: Math.round(Math.min(100, Math.max(0, total))),
    has_wearables: hasWearables,
  };
}

// ─── Pilier Santé (HI-03) ────────────────────────────────────────────────────
// Composantes :
//   60% soins à jour (vaccin/vermifuge/ferrage/dentiste/ostéo)
//   25% absence d'alerte vét active
//   15% régularité suivi (praticiens renseignés + historique)
function computeSante(healthRecords: HealthRecord[], now: Date): number | null {
  if (healthRecords.length === 0) return null;

  // ── Soins à jour (60 pts) ──────────────────────────────────────────────────
  const soins = [
    { type: "vaccin",    maxDays: 182, pts: 12 },
    { type: "vermifuge", maxDays: 90,  pts: 12 },
    { type: "ferrage",   maxDays: 35,  pts: 12 },
    { type: "dentiste",  maxDays: 365, pts: 12 },
    { type: "osteo",     maxDays: 180, pts: 12, optional: true },
  ];

  let soinsScore = 0;
  let soinsPossible = 0;

  for (const check of soins) {
    const records = healthRecords
      .filter((r) => r.type === check.type)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (records.length === 0) {
      if (!check.optional) soinsPossible += check.pts;
      continue;
    }

    soinsPossible += check.pts;
    const last = records[0];
    const nextDate = last.next_date ? parseISO(last.next_date) : null;

    if (nextDate) {
      const daysUntilNext = differenceInDays(nextDate, now);
      if (daysUntilNext >= 0)      soinsScore += check.pts;         // à jour
      else if (daysUntilNext >= -7) soinsScore += check.pts * 0.9;  // en retard J-7 = -10%
      else                          soinsScore += check.pts * 0.7;  // en retard = -30%
    } else {
      const daysSince = differenceInDays(now, parseISO(last.date));
      if (daysSince <= check.maxDays)          soinsScore += check.pts;
      else if (daysSince <= check.maxDays * 1.1) soinsScore += check.pts * 0.9;
      else                                       soinsScore += check.pts * 0.7;
    }
  }

  const soinsRatio = soinsPossible > 0 ? soinsScore / soinsPossible : 1;
  const soinsPts = soinsRatio * 60;

  // ── Absence alerte vét active (25 pts) ────────────────────────────────────
  // Si urgence = critique (non traitée dans les 7j) → -20%
  const critiques = healthRecords.filter(
    (r) => r.urgency === "critique" && differenceInDays(now, parseISO(r.date)) <= 30
  );
  const alertePts = critiques.length === 0 ? 25 : 25 * 0.8;

  // ── Régularité suivi (15 pts) ──────────────────────────────────────────────
  const hasVet   = healthRecords.some((r) => r.vet_name || r.type === "veterinaire");
  const hasMarechal = healthRecords.some((r) => r.type === "ferrage" && r.vet_name);
  const hasOsteo = healthRecords.some((r) => r.type === "osteo");
  const praticiensPts = [hasVet, hasMarechal, hasOsteo].filter(Boolean).length > 0 ? 5 : 0;
  const historiquePts = healthRecords.length >= 5 ? 10 : healthRecords.length >= 2 ? 5 : 0;
  const suiviPts = praticiensPts + historiquePts;

  return Math.round(Math.min(100, soinsPts + alertePts + suiviPts));
}

// ─── Pilier Bien-être (HI-04) ────────────────────────────────────────────────
// Composantes (tous modes) :
//   40% comportement noté (feeling 1-5)
//   30% conditions de vie adaptées au mode
//   30% régularité des sorties (variable par mode)
function computeBienetre(
  sessions: TrainingSession[],
  now: Date,
  windowDays: number,
): number | null {
  if (sessions.length === 0) return null;

  const recent = sessions.filter(
    (s) => differenceInDays(now, parseISO(s.date)) <= windowDays
  );

  if (recent.length === 0) return 50; // neutre si plus de séances récentes

  // ── Comportement noté (40 pts) ─────────────────────────────────────────────
  const avgFeeling = recent.reduce((s, h) => s + h.feeling, 0) / recent.length;
  // feeling 1-5 → 0-40 pts (3 = neutre = 24pts)
  const behaviorPts = Math.round(((avgFeeling - 1) / 4) * 40);

  // ── Conditions de vie (30 pts) — approximation via ratio repos/travail ────
  const trainingDays = new Set(recent.map((s) => s.date.substring(0, 10)));
  const restRatio = (windowDays - trainingDays.size) / windowDays;
  // Ratio idéal 30-55% de repos
  let conditionsPts: number;
  if (restRatio >= 0.3 && restRatio <= 0.55)     conditionsPts = 30;
  else if (restRatio >= 0.2 && restRatio < 0.3)  conditionsPts = 20;
  else if (restRatio > 0.55 && restRatio <= 0.7) conditionsPts = 22;
  else if (restRatio < 0.2)                       conditionsPts = 8;  // surmenage
  else                                            conditionsPts = 15; // trop de repos

  // ── Régularité sorties (30 pts) ────────────────────────────────────────────
  // Au moins 1 contact/semaine
  const weeksInWindow = Math.ceil(windowDays / 7);
  let weeksWithContact = 0;
  for (let w = 0; w < weeksInWindow; w++) {
    const hasContact = recent.some((s) => {
      const d = differenceInDays(now, parseISO(s.date));
      return d >= w * 7 && d < (w + 1) * 7;
    });
    if (hasContact) weeksWithContact++;
  }
  const sortiePts = Math.round((weeksWithContact / weeksInWindow) * 30);

  // Pénalité séances intenses sans récupération
  const intensive = recent.filter((s) => s.duration_min > 90 && s.intensity >= 4);
  const penalty = Math.min(8, intensive.filter((s) => !s.equipement_recuperation).length * 2);
  const bonus = recent.some((s) => !!s.equipement_recuperation) ? 3 : 0;

  return Math.round(Math.min(100, Math.max(0, behaviorPts + conditionsPts + sortiePts - penalty + bonus)));
}

// ─── Pilier Activité (HI-05) ────────────────────────────────────────────────
// Calcul adapté au mode de vie :
//   IC — performance & progression (régularité + qualité + concours)
//   IE — régularité, pas intensité (1 montée/semaine = correct)
//   IP — présence régulière (1 contact/semaine, montée non requise)
//   IR — respect du protocole (séances modérées, ni trop ni trop peu)
//   IS — liberté de mouvement (score élevé même sans montée)
//   ICr — développement naturel (contacts notés)
function computeActivite(
  sessions: TrainingSession[],
  competitions: Competition[],
  now: Date,
  mode: HorseIndexMode,
  windowDays: number,
): number | null {
  const validSessions = sessions.filter((s) => s.duration_min >= 10);

  // IS (Retraite) : un cheval à la retraite peut obtenir un score parfait sans montée
  // Les séances = contacts/sorties, pas de travail monté attendu
  if (mode === "IS") {
    // Score basé uniquement sur la présence de contacts dans la fenêtre
    const recent = sessions.filter((s) => differenceInDays(now, parseISO(s.date)) <= windowDays);
    if (sessions.length === 0) return null;
    const weeksInWindow = Math.ceil(windowDays / 7);
    let weeksWithContact = 0;
    for (let w = 0; w < weeksInWindow; w++) {
      const hasContact = recent.some((s) => {
        const d = differenceInDays(now, parseISO(s.date));
        return d >= w * 7 && d < (w + 1) * 7;
      });
      if (hasContact) weeksWithContact++;
    }
    // Si aucun contact, score neutre (pas de pénalité pour la retraite)
    if (weeksWithContact === 0) return 50;
    return Math.min(100, Math.round((weeksWithContact / weeksInWindow) * 100));
  }

  // ICr (Poulain) : valorise les contacts sans travail monté
  if (mode === "ICr") {
    if (sessions.length === 0) return null;
    const recent = sessions.filter((s) => differenceInDays(now, parseISO(s.date)) <= windowDays);
    const weeksInWindow = Math.ceil(windowDays / 7);
    let weeks = 0;
    for (let w = 0; w < weeksInWindow; w++) {
      if (recent.some((s) => {
        const d = differenceInDays(now, parseISO(s.date));
        return d >= w * 7 && d < (w + 1) * 7;
      })) weeks++;
    }
    if (weeks === 0) return 50;
    return Math.min(100, Math.round((weeks / weeksInWindow) * 100));
  }

  // IR (Convalescence) : séances trop nombreuses ou trop peu = score bas
  if (mode === "IR") {
    if (validSessions.length === 0) return null;
    const recent = validSessions.filter((s) => differenceInDays(now, parseISO(s.date)) <= windowDays);
    const weeksInWindow = Math.ceil(windowDays / 7);
    const avgPerWeek = recent.length / weeksInWindow;
    // Cible : 1-3 séances légères/semaine. Suractivité autant pénalisée que sous-activité
    if (avgPerWeek === 0) return 30;
    if (avgPerWeek >= 1 && avgPerWeek <= 3) return 85;
    if (avgPerWeek < 1) return Math.round(30 + avgPerWeek * 55);
    // Suractivité > 5/semaine
    if (avgPerWeek > 5) return Math.round(Math.max(20, 85 - (avgPerWeek - 3) * 15));
    return 70;
  }

  // IP (Semi-actif) : 1 contact/semaine = suffisant, montée non requise
  if (mode === "IP") {
    if (sessions.length === 0) return null;
    const recent = sessions.filter((s) => differenceInDays(now, parseISO(s.date)) <= windowDays);
    const weeksInWindow = Math.ceil(windowDays / 7);
    let weeksWithContact = 0;
    for (let w = 0; w < weeksInWindow; w++) {
      if (recent.some((s) => {
        const d = differenceInDays(now, parseISO(s.date));
        return d >= w * 7 && d < (w + 1) * 7;
      })) weeksWithContact++;
    }
    if (weeksWithContact === 0) return null;
    // 1 contact/semaine = déjà un bon score, pas de pénalité pour faible fréquence
    return Math.min(100, Math.round(50 + (weeksWithContact / weeksInWindow) * 50));
  }

  // ── IC / IE — travail monté régulier ──────────────────────────────────────
  if (validSessions.length < 3) return null;

  const recent = validSessions.filter((s) => differenceInDays(now, parseISO(s.date)) <= windowDays);
  if (recent.length === 0) return 0;

  const weeksInWindow = Math.ceil(windowDays / 7);
  const currentWeekly = recent.length / weeksInWindow;

  // IE : 1 séance/semaine = score correct, pas de pénalité si < 4/mois
  // IC : 4 séances/semaine = score parfait
  const targetWeekly = mode === "IC" ? 4 : 1.5;
  let regulariteScore = Math.min(50, (currentWeekly / targetWeekly) * 50);

  // Pénalité gap
  const sorted = recent.map((s) => parseISO(s.date)).sort((a, b) => a.getTime() - b.getTime());
  let maxGap = 0;
  for (let i = 1; i < sorted.length; i++) {
    const gap = differenceInDays(sorted[i], sorted[i - 1]);
    if (gap > maxGap) maxGap = gap;
  }
  if (mode === "IC") {
    if (maxGap > 14)       regulariteScore *= 0.6;
    else if (maxGap > 10)  regulariteScore *= 0.75;
    else if (maxGap > 7)   regulariteScore *= 0.85;
  }
  // IE : pas de pénalité si fréquence < 4 séances/mois (le loisir est assumé)

  // Progression
  const allValid = validSessions.filter((s) => differenceInDays(now, parseISO(s.date)) <= 180);
  let progressionScore = 25;

  if (allValid.length >= 4) {
    const firstHalf  = allValid.filter((s) => differenceInDays(now, parseISO(s.date)) > 90);
    const secondHalf = allValid.filter((s) => differenceInDays(now, parseISO(s.date)) <= 90);

    const avgI1 = firstHalf.length  ? firstHalf.reduce((s, h) => s + h.intensity, 0) / firstHalf.length : 3;
    const avgI2 = secondHalf.length ? secondHalf.reduce((s, h) => s + h.intensity, 0) / secondHalf.length : 3;
    const avgF1 = firstHalf.length  ? firstHalf.reduce((s, h) => s + h.feeling, 0) / firstHalf.length : 3;
    const avgF2 = secondHalf.length ? secondHalf.reduce((s, h) => s + h.feeling, 0) / secondHalf.length : 3;

    const trend = ((avgI2 - avgI1) + (avgF2 - avgF1)) / 2;
    progressionScore = Math.max(0, Math.min(50, 25 + trend * 10));
  }

  // Bonus concours (IC uniquement)
  if (mode === "IC") {
    const recentComps = competitions.filter(
      (c) => differenceInDays(now, parseISO(c.date)) <= 180 && c.result_rank && c.total_riders
    );
    if (recentComps.length > 0) {
      const avgPct = recentComps.reduce(
        (s, c) => s + (1 - (c.result_rank! - 1) / c.total_riders!), 0
      ) / recentComps.length;
      progressionScore = Math.min(50, progressionScore + avgPct * 5);
    }
  }

  return Math.round(Math.min(100, regulariteScore + progressionScore));
}

// ─── Pilier Suivi proprio (HI-06) ────────────────────────────────────────────
// Composantes exactes du spec :
//   40% profil cheval complet (nom, race, âge, logement, mode de vie)
//   40% au moins 1 saisie (journal, soin) dans les 14 derniers jours
//   10% trousseau de couvertures renseigné
//   10% localisation écurie renseignée
// Jamais punitif : si pas de saisie → score passe en Incomplet (HI-08), pas 0
function computeSuiviProprio(data: HorseData, now: Date): number {
  let score = 0;

  // Profil cheval complet (40 pts)
  const p = data.horseProfile;
  if (p) {
    const fields = [p.breed, p.birth_year, p.conditions_vie];
    const filledCount = fields.filter(Boolean).length;
    score += Math.round((filledCount / fields.length) * 40);
  }

  // Au moins 1 saisie dans les 14 derniers jours (40 pts)
  const recentTraining = data.trainingSessions.some(
    (s) => differenceInDays(now, parseISO(s.date)) <= 14
  );
  const recentHealth = data.healthRecords.some(
    (r) => differenceInDays(now, parseISO(r.date)) <= 14
  );
  if (recentTraining || recentHealth) score += 40;

  // Trousseau renseigné (10 pts)
  if (p?.trousseau && Array.isArray(p.trousseau) && p.trousseau.length > 0) score += 10;

  // Localisation écurie renseignée (10 pts)
  if (p?.ecurie) score += 10;

  return Math.round(Math.min(100, score));
}
