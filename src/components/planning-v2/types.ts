import type { TrainingSession, TrainingPlannedSession } from "@/lib/supabase/types";

// ── Modes de vue ─────────────────────────────────────────────────────────────
export type ViewMode = "semaine" | "mois";

// ── État d'un jour ───────────────────────────────────────────────────────────
export type DayStateKind = "repos" | "fait" | "planifie" | "complement" | "mixte";

export type DayState = {
  kind: DayStateKind;
  /** Nombre de séances principales (hors compléments) faites */
  doneCount: number;
  /** Nombre de séances planifiées non réalisées */
  plannedCount: number;
  /** Nombre de compléments (marcheur, paddock) */
  complementCount: number;
  /** Charge totale en minutes (done + complement) */
  totalMinutes: number;
};

// ── Props SessionCard ────────────────────────────────────────────────────────
export type SessionCardData =
  | { source: "done"; session: TrainingSession; horseName?: string }
  | { source: "planned"; planned: TrainingPlannedSession; horseName?: string };

// ── Horse minimal pour le planning ───────────────────────────────────────────
export type PlanningHorse = {
  id: string;
  name: string;
  avatar_url: string | null;
  horse_index_mode: string | null;
};

// ── Suggestion IA ────────────────────────────────────────────────────────────
export type AISuggestion = {
  date: string;
  type: string;
  duration_min: number;
  intensity: number;
  notes?: string;
};
