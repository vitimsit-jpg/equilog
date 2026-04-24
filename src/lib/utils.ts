import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, differenceInDays, parseISO, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, fmt = "d MMM yyyy") {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, fmt, { locale: fr });
}

export function formatDateRelative(date: string | Date) {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: fr });
}

export function daysUntil(date: string | Date): number {
  const d = typeof date === "string" ? parseISO(date) : date;
  return differenceInDays(startOfDay(d), startOfDay(new Date()));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getUrgencyColor(daysLeft: number): string {
  if (daysLeft < 0) return "text-danger";
  if (daysLeft <= 7) return "text-danger";
  if (daysLeft <= 30) return "text-warning";
  return "text-success";
}

export function getUrgencyBadge(daysLeft: number): string {
  if (daysLeft < 0) return "badge-danger";
  if (daysLeft <= 7) return "badge-danger";
  if (daysLeft <= 30) return "badge-warning";
  return "badge-success";
}

export const HEALTH_TYPE_LABELS: Record<string, string> = {
  vaccin: "Vaccin",
  vermifuge: "Vermifuge",
  dentiste: "Dentiste",
  osteo: "Ostéopathie",
  ferrage: "Parage",
  veterinaire: "Vétérinaire",
  masseuse: "Masseuse",
  autre: "Autre",
  // Soins thérapeutiques IS (retraite / bien-être)
  acupuncture: "Acupuncture",
  physio_laser: "Physio. laser",
  physio_ultrasons: "Physio. ultrasons",
  physio_tens: "Physio. TENS",
  pemf: "PEMF",
  infrarouge: "Infrarouge",
  cryotherapie: "Cryothérapie",
  thermotherapie: "Thermothérapie",
  pressotherapie: "Pressothérapie",
  ems: "EMS",
  bandes_repos: "Bandes de repos",
  etirements_passifs: "Étirements passifs",
  infiltrations: "Infiltrations",
  mesotherapie: "Mésothérapie",
  // Soins thérapeutiques IR (convalescence) supplémentaires
  balneotherapie: "Balnéothérapie",
  water_treadmill: "Water treadmill",
  tapis_marcheur: "Tapis marcheur",
  ondes_choc: "Ondes de choc",
};

// TRAV-26 — Source unique : src/constants/sessionTypes.ts
// Rétro-compatibilité : TRAINING_TYPE_LABELS et TRAINING_EMOJIS re-exportés avec legacy keys
import { SESSION_TYPE_EMOJIS, SESSION_TYPE_LABELS } from "@/constants/sessionTypes";
export { SESSION_TYPE_CONFIG, SESSION_TYPE_EMOJIS, SESSION_TYPE_LABELS, SESSION_TYPE_COLORS, getSessionEmoji, getSessionLabel, DISCIPLINE_GRID_ITEMS } from "@/constants/sessionTypes";

export const TRAINING_TYPE_LABELS: Record<string, string> = {
  ...SESSION_TYPE_LABELS,
  saut: "Saut d'obstacles",
  endurance: "Endurance",
  cso: "CSO",
  cross: "Cross",
};

export const TRAINING_EMOJIS: Record<string, string> = {
  ...SESSION_TYPE_EMOJIS,
  // Legacy keys (données historiques)
  saut: "🏇",
  endurance: "🏅",
  cso: "🔁",
  cross: "🌿",
};

export const BUDGET_CATEGORY_LABELS: Record<string, string> = {
  pension: "Pension",
  soins: "Soins vét.",
  concours: "Concours",
  equipement: "Équipement",
  "maréchalerie": "Maréchalerie",
  alimentation: "Alimentation",
  transport: "Transport",
  autre: "Autre",
};

export const DISCIPLINE_LABELS: Record<string, string> = {
  CSO: "CSO",
  Dressage: "Dressage",
  CCE: "CCE",
  Endurance: "Endurance",
  Attelage: "Attelage",
  Voltige: "Voltige",
  TREC: "TREC",
  Hunter: "Hunter",
  Equitation_Western: "Équitation Western",
  Autre: "Autre",
};

export const INTENSITY_LABELS: Record<number, string> = {
  1: "Très léger",
  2: "Léger",
  3: "Modéré",
  4: "Intense",
  5: "Très intense",
};

export const FEELING_LABELS: Record<number, string> = {
  1: "Très mauvais",
  2: "Mauvais",
  3: "Correct",
  4: "Bon",
  5: "Excellent",
};

export function generateShareToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export function getScoreColor(score: number): string {
  if (score >= 75) return "#16A34A";
  if (score >= 45) return "#E8440A";
  if (score >= 25) return "#D97706";
  return "#DC2626";
}

export function getScoreLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Très bon";
  if (score >= 55) return "Bon";
  if (score >= 35) return "En progression";
  return "À construire";
}
