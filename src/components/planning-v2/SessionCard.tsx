"use client";

import { Check, Pencil, SkipForward, GripVertical } from "lucide-react";
import { getTypeColor, getTypeEmoji, getTypeLabel, isComplement } from "./constants";
import type { SessionCardData } from "./types";

const FEELING_EMOJIS = ["", "🤕", "😕", "😐", "🙂", "😄"];

interface Props {
  data: SessionCardData;
  onCheckDone?: () => void;
  onEdit?: () => void;
  onSkip?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export default function SessionCard({ data, onCheckDone, onEdit, onSkip, draggable, onDragStart }: Props) {
  const isPlanned = data.source === "planned";
  const type = isPlanned ? data.planned.type : data.session.type;
  const duration = isPlanned
    ? data.planned.duration_min_target ?? 45
    : data.session.duration_min;
  const notes = isPlanned ? data.planned.notes : data.session.notes;
  const color = getTypeColor(type);
  const emoji = getTypeEmoji(type);
  const label = getTypeLabel(type);
  const complement = isComplement(type);
  const horseName = data.horseName;

  // Done session extras
  const feeling = !isPlanned ? data.session.feeling : null;
  const intensity = !isPlanned ? data.session.intensity : null;

  return (
    <div
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
        isPlanned
          ? "border-2 border-dashed border-gray-300 bg-white hover:border-orange/50"
          : complement
          ? `border ${color.border} ${color.bg}/50`
          : `border ${color.border} ${color.bg}`
      }`}
      draggable={draggable && isPlanned}
      onDragStart={onDragStart}
    >
      {/* Barre gauche colorée */}
      <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${isPlanned ? "bg-gray-300" : color.bar}`} />

      {/* Contenu principal */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{emoji}</span>
          <span className={`text-sm font-semibold ${isPlanned ? "text-gray-600" : color.text}`}>
            {label}
          </span>
          <span className="text-xs text-gray-400">{duration}min</span>
          {isPlanned && (
            <span className="text-2xs font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
              Planifié
            </span>
          )}
        </div>
        {horseName && (
          <p className="text-2xs text-gray-400 mt-0.5">{horseName}</p>
        )}
        {notes && (
          <p className="text-2xs text-gray-400 mt-0.5 truncate">{notes}</p>
        )}
        {!isPlanned && (feeling || intensity) && (
          <div className="flex items-center gap-2 mt-0.5">
            {intensity && (
              <span className="text-2xs text-gray-400">Intensité {intensity}/5</span>
            )}
            {feeling && (
              <span className="text-sm">{FEELING_EMOJIS[feeling]}</span>
            )}
          </div>
        )}
      </div>

      {/* Actions (visible au hover ou toujours sur mobile) */}
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity sm:opacity-100">
        {isPlanned && onCheckDone && (
          <button
            onClick={onCheckDone}
            className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
            title="Cocher fait"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
        {onEdit && (
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
            title="Modifier"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        {isPlanned && onSkip && (
          <button
            onClick={onSkip}
            className="p-1.5 rounded-lg bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Reporter"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        )}
        {draggable && isPlanned && (
          <div className="p-1 text-gray-300 cursor-grab">
            <GripVertical className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
    </div>
  );
}
