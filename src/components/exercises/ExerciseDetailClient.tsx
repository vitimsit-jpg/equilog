"use client";

/**
 * BIBL-25 — Détail exercice (client)
 * - Schéma piste avec pinch-to-zoom natif (touch-action: pinch-zoom)
 * - Toggle favori (optimiste)
 * - Bouton sticky "Ajouter à une séance" → picker cheval → QuickTrainingModal
 */

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Heart, Clock, Target, Tag, ChevronRight, X, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import Image from "next/image";
import type { Exercise, TrainingType } from "@/lib/supabase/types";
import QuickTrainingModal from "@/components/training/QuickTrainingModal";
import { CATEGORY_CONFIG } from "./ExerciseLibraryClient";

// ── Types ──────────────────────────────────────────────────────────────────────

interface HorseRow {
  id: string;
  name: string;
  avatar_url: string | null;
  horse_index_mode: string | null;
}

interface Props {
  exercise: Exercise;
  isFavorite: boolean;
  userId: string;
  horses: HorseRow[];
  defaultHorseId?: string;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  debutant:      "Débutant",
  intermediaire: "Intermédiaire",
  avance:        "Avancé",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  debutant:      "bg-green-100 text-green-700",
  intermediaire: "bg-amber-100 text-amber-700",
  avance:        "bg-red-100 text-red-700",
};

// ── Composant principal ────────────────────────────────────────────────────────

export default function ExerciseDetailClient({ exercise, isFavorite, userId, horses, defaultHorseId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [, startTransition] = useTransition();

  const cat = CATEGORY_CONFIG[exercise.category];

  // Favori
  const [fav, setFav] = useState(isFavorite);
  const [favLoading, setFavLoading] = useState(false);

  // Picker cheval
  const [showPicker, setShowPicker] = useState(false);
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(defaultHorseId || null);
  const [modalOpen, setModalOpen] = useState(false);

  // Pinch-to-zoom state
  const [scale, setScale] = useState(1);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const lastDistance = useRef<number | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // ── Favoris ──────────────────────────────────────────────────────────────────

  async function toggleFavorite() {
    if (favLoading) return;
    const next = !fav;
    setFav(next);
    setFavLoading(true);
    try {
      if (next) {
        await supabase
          .from("user_exercise_favorites")
          .insert({ user_id: userId, exercise_id: exercise.id });
      } else {
        await supabase
          .from("user_exercise_favorites")
          .delete()
          .eq("user_id", userId)
          .eq("exercise_id", exercise.id);
      }
    } catch {
      setFav(!next);
      toast.error("Erreur lors de la mise à jour des favoris");
    } finally {
      setFavLoading(false);
    }
    startTransition(() => router.refresh());
  }

  // ── Pinch-to-zoom ────────────────────────────────────────────────────────────

  function getDistance(touches: React.TouchList) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      lastDistance.current = getDistance(e.touches);
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && lastDistance.current !== null) {
      e.preventDefault();
      const dist = getDistance(e.touches);
      const delta = dist / lastDistance.current;
      setScale((prev) => Math.min(Math.max(prev * delta, 1), 4));
      lastDistance.current = dist;

      // Centre du pinch comme origine
      if (imgRef.current) {
        const rect = imgRef.current.getBoundingClientRect();
        const midX = ((e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left) / rect.width * 100;
        const midY = ((e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top) / rect.height * 100;
        setOrigin({ x: midX, y: midY });
      }
    }
  }

  function handleTouchEnd() {
    lastDistance.current = null;
    if (scale < 1.05) { setScale(1); setOrigin({ x: 50, y: 50 }); }
  }

  function resetZoom() {
    setScale(1);
    setOrigin({ x: 50, y: 50 });
  }

  // ── Ouvrir la séance ──────────────────────────────────────────────────────────

  function handleAddToSession() {
    if (horses.length === 0) {
      toast.error("Aucun cheval actif trouvé");
      return;
    }
    if (horses.length === 1 || defaultHorseId) {
      setSelectedHorseId(defaultHorseId || horses[0].id);
      setModalOpen(true);
    } else {
      setShowPicker(true);
    }
  }

  function selectHorse(horseId: string) {
    setSelectedHorseId(horseId);
    setShowPicker(false);
    setModalOpen(true);
  }

  const selectedHorse = horses.find((h) => h.id === selectedHorseId);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="pb-28">
      {/* Nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 active:opacity-60"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>
        <button
          onClick={toggleFavorite}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 active:opacity-60 transition-opacity"
          aria-label={fav ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          <Heart className={`h-4 w-4 transition-colors ${fav ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
          <span className="text-xs font-semibold text-gray-600">{fav ? "Favori" : "Ajouter"}</span>
        </button>
      </div>

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full border ${cat.bg} ${cat.color}`}>
            {cat.emoji} {cat.label}
          </span>
          {exercise.difficulty && (
            <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[exercise.difficulty] || "bg-gray-100 text-gray-600"}`}>
              {DIFFICULTY_LABELS[exercise.difficulty] || exercise.difficulty}
            </span>
          )}
          {exercise.duration_min && (
            <span className="flex items-center gap-0.5 text-2xs text-gray-400">
              <Clock className="h-3 w-3" />
              {exercise.duration_min} min
            </span>
          )}
        </div>
        <h1 className="text-xl font-black text-black leading-snug">{exercise.title}</h1>
      </div>

      {/* Schéma piste */}
      {exercise.schema_url && (
        <div className="mb-4 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
          <div className="relative overflow-hidden" style={{ touchAction: scale > 1 ? "none" : "pan-y" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={exercise.schema_url}
              alt={`Schéma — ${exercise.title}`}
              className="w-full object-contain transition-transform duration-100"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: `${origin.x}% ${origin.y}%`,
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
            {scale > 1 && (
              <button
                onClick={resetZoom}
                className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white text-2xs rounded-lg backdrop-blur-sm"
              >
                Réinitialiser
              </button>
            )}
          </div>
          {scale === 1 && (
            <p className="text-center text-2xs text-gray-400 py-1.5">Pincez pour zoomer</p>
          )}
        </div>
      )}

      {/* Description */}
      {exercise.description && (
        <div className="card mb-4">
          <p className="text-sm text-gray-700 leading-relaxed">{exercise.description}</p>
        </div>
      )}

      {/* Objectifs */}
      {exercise.objectifs && exercise.objectifs.length > 0 && (
        <div className="card mb-4">
          <div className="flex items-center gap-2 mb-2.5">
            <Target className="h-4 w-4 text-orange flex-shrink-0" />
            <h2 className="text-sm font-bold text-black">Objectifs</h2>
          </div>
          <ul className="space-y-1.5">
            {exercise.objectifs.map((obj, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="h-3.5 w-3.5 text-success flex-shrink-0 mt-0.5" />
                <span className="text-xs text-gray-700">{obj}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tags */}
      {exercise.tags && exercise.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <Tag className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          {exercise.tags.map((tag) => (
            <span key={tag} className="text-2xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Picker cheval (bottom sheet) */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPicker(false)} />
          <div className="relative bg-white rounded-t-2xl px-4 pt-4 pb-safe pb-6 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-black">Choisir un cheval</h3>
              <button onClick={() => setShowPicker(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-2">
              {horses.map((horse) => (
                <button
                  key={horse.id}
                  onClick={() => selectHorse(horse.id)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-gray-50 active:bg-gray-100 transition-colors text-left"
                >
                  {horse.avatar_url ? (
                    <Image src={horse.avatar_url} alt={horse.name} width={40} height={40} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-gray-500">{horse.name[0]}</span>
                    </div>
                  )}
                  <span className="text-sm font-semibold text-black flex-1">{horse.name}</span>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QuickTrainingModal */}
      {selectedHorse && (
        <QuickTrainingModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          horseId={selectedHorse.id}
          horseName={selectedHorse.name}
          onSaved={() => {
            setModalOpen(false);
            toast.success("Séance enregistrée !");
          }}
          defaultWorkType={exercise.training_type as TrainingType}
          defaultNote={`Exercice : ${exercise.title}`}
        />
      )}

      {/* Bouton sticky "Ajouter à une séance" */}
      <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-safe pb-4 pt-2 bg-white/95 backdrop-blur-sm border-t border-gray-100">
        <button
          onClick={handleAddToSession}
          className="w-full py-3.5 bg-orange text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 active:opacity-90 transition-opacity"
        >
          Ajouter à une séance
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
