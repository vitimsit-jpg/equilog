"use client";

import { useRef, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";

interface Props {
  onDelete: () => void;
  children: ReactNode;
  disabled?: boolean;
}

const DRAG_MAX    = 96;  // max px pulled left
const DELETE_SNAP = 72;  // threshold to snap to delete zone
const DELETE_FIRE = 200; // full-swipe-off distance to fire immediately

export default function SwipeToDelete({ onDelete, children, disabled = false }: Props) {
  const startX    = useRef<number | null>(null);
  const [offset, setOffset]       = useState(0);
  const [dragging, setDragging]   = useState(false);
  const [revealed, setRevealed]   = useState(false);
  const [removing, setRemoving]   = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || removing) return;
    startX.current = e.touches[0].clientX;
    setDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null || disabled || removing) return;
    const delta = e.touches[0].clientX - startX.current;
    if (delta > 0 && !revealed) return; // ignore right swipe when not revealed
    const raw = revealed ? delta - DELETE_SNAP : delta;
    setOffset(Math.min(0, Math.max(raw, -DELETE_FIRE)));
  };

  const handleTouchEnd = () => {
    setDragging(false);
    if (offset <= -DELETE_FIRE) {
      fireDelete();
    } else if (offset <= -DELETE_SNAP) {
      setOffset(-DELETE_SNAP);
      setRevealed(true);
    } else {
      setOffset(0);
      setRevealed(false);
    }
    startX.current = null;
  };

  const fireDelete = () => {
    setRemoving(true);
    setOffset(-window.innerWidth);
    setTimeout(onDelete, 280);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Delete zone behind the row */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-danger"
        style={{ width: DRAG_MAX }}
      >
        {revealed ? (
          <button
            onClick={fireDelete}
            className="flex flex-col items-center gap-1 text-white px-4"
          >
            <Trash2 className="h-5 w-5" />
            <span className="text-2xs font-bold">Supprimer</span>
          </button>
        ) : (
          <Trash2 className="h-5 w-5 text-white/60" />
        )}
      </div>

      {/* Sliding content */}
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 0.28s cubic-bezier(0.25, 1, 0.5, 1)",
          willChange: "transform",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (revealed) { setOffset(0); setRevealed(false); }
        }}
      >
        {children}
      </div>
    </div>
  );
}
