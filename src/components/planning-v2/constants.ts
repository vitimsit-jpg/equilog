import { TRAINING_TYPE_LABELS, TRAINING_EMOJIS } from "@/lib/utils";

// ── Couleurs par type de discipline ──────────────────────────────────────────

export type TypeColor = { bg: string; text: string; border: string; bar: string };

const TYPE_COLORS: Record<string, TypeColor> = {
  dressage:               { bg: "bg-blue-100",   text: "text-blue-800",   border: "border-blue-300",   bar: "bg-blue-400" },
  plat:                   { bg: "bg-sky-100",    text: "text-sky-800",    border: "border-sky-300",    bar: "bg-sky-400" },
  cross_entrainement:     { bg: "bg-amber-100",  text: "text-amber-800",  border: "border-amber-300",  bar: "bg-amber-400" },
  balade:                 { bg: "bg-teal-100",   text: "text-teal-800",   border: "border-teal-300",   bar: "bg-teal-400" },
  marcheur:               { bg: "bg-gray-100",   text: "text-gray-500",   border: "border-gray-300",   bar: "bg-gray-400" },
  paddock:                { bg: "bg-lime-100",   text: "text-lime-800",   border: "border-lime-300",   bar: "bg-lime-400" },
  stretching:             { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300", bar: "bg-purple-400" },
  longe:                  { bg: "bg-pink-100",   text: "text-pink-800",   border: "border-pink-300",   bar: "bg-pink-400" },
  longues_renes:          { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-300", bar: "bg-indigo-400" },
  travail_a_pied:         { bg: "bg-violet-100", text: "text-violet-800", border: "border-violet-300", bar: "bg-violet-400" },
  trotting:               { bg: "bg-red-100",    text: "text-red-800",    border: "border-red-300",    bar: "bg-red-400" },
  galop:                  { bg: "bg-red-100",    text: "text-red-800",    border: "border-red-300",    bar: "bg-red-400" },
  barres_sol:             { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300", bar: "bg-yellow-400" },
  cavalettis:             { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300", bar: "bg-yellow-400" },
  meca_obstacles:         { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300", bar: "bg-orange-400" },
  obstacles_enchainement: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300", bar: "bg-orange-400" },
  concours:               { bg: "bg-rose-100",   text: "text-rose-800",   border: "border-rose-300",   bar: "bg-rose-400" },
  autre:                  { bg: "bg-gray-100",   text: "text-gray-500",   border: "border-gray-200",   bar: "bg-gray-300" },
};

const DEFAULT_COLOR: TypeColor = { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200", bar: "bg-gray-300" };

export function getTypeColor(type: string): TypeColor {
  return TYPE_COLORS[type] ?? DEFAULT_COLOR;
}

export function getTypeEmoji(type: string): string {
  return TRAINING_EMOJIS[type] ?? "✳️";
}

export function getTypeLabel(type: string): string {
  return TRAINING_TYPE_LABELS[type] ?? type;
}

// ── Charge journalière ───────────────────────────────────────────────────────

export function getLoadColor(totalMinutes: number): string {
  if (totalMinutes <= 0) return "bg-gray-200";
  if (totalMinutes < 45) return "bg-green-400";
  if (totalMinutes < 90) return "bg-orange";
  return "bg-red-500";
}

// ── Compléments ──────────────────────────────────────────────────────────────

export function isComplement(type: string): boolean {
  return type === "marcheur" || type === "paddock";
}
