import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, differenceInDays, parseISO } from "date-fns";
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
  return differenceInDays(d, new Date());
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

export const TRAINING_TYPE_LABELS: Record<string, string> = {
  dressage: "Dressage",
  plat: "Plat",
  stretching: "Stretching & récup",
  barres_sol: "Barres au sol",
  cavalettis: "Cavalettis",
  meca_obstacles: "Méca obstacles",
  obstacles_enchainement: "Obstacles enchaînés",
  cross_entrainement: "Cross entraînement",
  longe: "Longe",
  longues_renes: "Longues rênes",
  travail_a_pied: "Travail à pied",
  balade: "Balade",
  trotting: "Trotting",
  galop: "Galop",
  marcheur: "Marcheur",
  concours: "Concours",
  autre: "Autre",
  // Legacy keys — kept for existing data rows
  saut: "Saut d'obstacles",
  endurance: "Endurance",
  cso: "CSO",
  cross: "Cross",
};

export const TRAINING_EMOJIS: Record<string, string> = {
  dressage: "🎯", plat: "🏇", stretching: "🤸", barres_sol: "📏",
  cavalettis: "🔲", meca_obstacles: "🚧", obstacles_enchainement: "🏁",
  cross_entrainement: "🌲", longe: "🌀", longues_renes: "🪢",
  travail_a_pied: "🦶", balade: "🌿", trotting: "🏃", galop: "💨",
  marcheur: "⚙️", paddock: "🌾", concours: "🏆", autre: "✳️",
  repos: "😴", saut: "🏇", endurance: "🏅", cso: "🏁", cross: "🌲",
};

export const BUDGET_CATEGORY_LABELS: Record<string, string> = {
  pension: "Pension",
  soins: "Soins vétérinaires",
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
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
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
