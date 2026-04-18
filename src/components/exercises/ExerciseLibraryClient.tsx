"use client";

/**
 * BIBL-25 — Bibliothèque d'exercices — vue liste / catégories
 * Gère : recherche, filtre catégorie, toggle favoris (optimiste)
 */

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, Heart, ChevronRight, Dumbbell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import type { Exercise, ExerciseCategory } from "@/lib/supabase/types";

// ── Constantes ─────────────────────────────────────────────────────────────────

// TRAV-26 — Emojis depuis source centrale, styles CSS locaux (spécifiques à la bibliothèque)
import { getSessionEmoji } from "@/constants/sessionTypes";
export const CATEGORY_CONFIG: Record<ExerciseCategory, { label: string; emoji: string; color: string; bg: string }> = {
  plat:           { label: "Plat",             emoji: getSessionEmoji("plat"),           color: "text-blue-700",   bg: "bg-blue-50 border-blue-100" },
  obstacle:       { label: "Obstacles",        emoji: getSessionEmoji("meca_obstacles"), color: "text-orange-700", bg: "bg-orange-50 border-orange-100" },
  cross:          { label: "Cross",            emoji: getSessionEmoji("cross_entrainement"), color: "text-green-700",  bg: "bg-green-50 border-green-100" },
  longe:          { label: "Longe",            emoji: getSessionEmoji("longe"),          color: "text-purple-700", bg: "bg-purple-50 border-purple-100" },
  travail_a_pied: { label: "Travail à pied",   emoji: getSessionEmoji("travail_a_pied"), color: "text-amber-700",  bg: "bg-amber-50 border-amber-100" },
};

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

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  exercises: Exercise[];
  favoriteIds: Set<string>;
  userId: string;
  horseId?: string;
  initialCategory?: string;
  initialQuery?: string;
}

// ── Composant ──────────────────────────────────────────────────────────────────

export default function ExerciseLibraryClient({
  exercises,
  favoriteIds: initialFavoriteIds,
  userId,
  horseId,
  initialCategory,
  initialQuery,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [, startTransition] = useTransition();

  const [query, setQuery] = useState(initialQuery || "");
  const [activeCategory, setActiveCategory] = useState<ExerciseCategory | "favoris" | null>(
    (initialCategory as ExerciseCategory) || null
  );
  const [favorites, setFavorites] = useState<Set<string>>(initialFavoriteIds);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── Filtrage ────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = exercises;

    if (activeCategory === "favoris") {
      list = list.filter((e) => favorites.has(e.id));
    } else if (activeCategory) {
      list = list.filter((e) => e.category === activeCategory);
    }

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.tags || []).some((t) => t.toLowerCase().includes(q)) ||
          (e.description || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [exercises, activeCategory, query, favorites]);

  // ── Grouper par catégorie quand pas de filtre actif ─────────────────────────

  const grouped = useMemo<Record<ExerciseCategory, Exercise[]>>(() => {
    const result = {} as Record<ExerciseCategory, Exercise[]>;
    for (const cat of Object.keys(CATEGORY_CONFIG) as ExerciseCategory[]) {
      result[cat] = filtered.filter((e) => e.category === cat);
    }
    return result;
  }, [filtered]);

  const showGrouped = !activeCategory && !query.trim();

  // ── Toggle favori ────────────────────────────────────────────────────────────

  async function toggleFavorite(exerciseId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (togglingId) return;

    const isFav = favorites.has(exerciseId);
    // Optimistic update
    setFavorites((prev) => {
      const next = new Set(prev);
      isFav ? next.delete(exerciseId) : next.add(exerciseId);
      return next;
    });
    setTogglingId(exerciseId);

    try {
      if (isFav) {
        await supabase
          .from("user_exercise_favorites")
          .delete()
          .eq("user_id", userId)
          .eq("exercise_id", exerciseId);
      } else {
        await supabase
          .from("user_exercise_favorites")
          .insert({ user_id: userId, exercise_id: exerciseId });
      }
    } catch {
      // Rollback
      setFavorites((prev) => {
        const next = new Set(prev);
        isFav ? next.add(exerciseId) : next.delete(exerciseId);
        return next;
      });
      toast.error("Erreur lors de la mise à jour des favoris");
    } finally {
      setTogglingId(null);
    }

    startTransition(() => router.refresh());
  }

  // ── Carte exercice ───────────────────────────────────────────────────────────

  function ExerciseCard({ exercise }: { exercise: Exercise }) {
    const cat = CATEGORY_CONFIG[exercise.category];
    const isFav = favorites.has(exercise.id);
    const href = `/exercises/${exercise.id}${horseId ? `?horseId=${horseId}` : ""}`;

    return (
      <Link
        href={href}
        className="block bg-white rounded-xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)] active:opacity-80 transition-opacity overflow-hidden"
      >
        <div className="p-3.5">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base leading-none flex-shrink-0">{cat.emoji}</span>
              <h3 className="text-sm font-bold text-black leading-snug">{exercise.title}</h3>
            </div>
            <button
              onClick={(e) => toggleFavorite(exercise.id, e)}
              className="flex-shrink-0 p-1 -m-1 rounded-lg"
              aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              <Heart
                className={`h-4 w-4 transition-colors ${isFav ? "fill-red-500 text-red-500" : "text-gray-300"}`}
              />
            </button>
          </div>

          {exercise.description && (
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2.5">
              {exercise.description}
            </p>
          )}

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full border ${cat.bg} ${cat.color}`}>
              {cat.label}
            </span>
            {exercise.difficulty && (
              <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[exercise.difficulty] || "bg-gray-100 text-gray-600"}`}>
                {DIFFICULTY_LABELS[exercise.difficulty] || exercise.difficulty}
              </span>
            )}
            {exercise.duration_min && (
              <span className="text-2xs text-gray-400">{exercise.duration_min} min</span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const favCount = exercises.filter((e) => favorites.has(e.id)).length;

  return (
    <div className="space-y-4 pb-8">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-light flex items-center justify-center flex-shrink-0">
          <Dumbbell className="h-5 w-5 text-orange" />
        </div>
        <div>
          <h1 className="text-lg font-black text-black leading-tight">Bibliothèque</h1>
          <p className="text-2xs text-gray-400">{exercises.length} exercices · {favCount} favori{favCount !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un exercice…"
          className="w-full pl-10 pr-9 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange/20 focus:border-orange/30"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Filtres catégories */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        <button
          onClick={() => setActiveCategory(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            activeCategory === null
              ? "bg-black text-white"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          Tout
        </button>
        {favCount > 0 && (
          <button
            onClick={() => setActiveCategory("favoris")}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              activeCategory === "favoris"
                ? "bg-red-500 text-white"
                : "bg-red-50 text-red-600"
            }`}
          >
            <Heart className="h-3 w-3" />
            Favoris
          </button>
        )}
        {(Object.entries(CATEGORY_CONFIG) as [ExerciseCategory, typeof CATEGORY_CONFIG[ExerciseCategory]][]).map(([cat, cfg]) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
            className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
              activeCategory === cat
                ? "bg-black text-white border-black"
                : `${cfg.bg} ${cfg.color}`
            }`}
          >
            <span>{cfg.emoji}</span>
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {showGrouped ? (
        // Vue par catégorie (accueil)
        <div className="space-y-5">
          {(Object.entries(CATEGORY_CONFIG) as [ExerciseCategory, typeof CATEGORY_CONFIG[ExerciseCategory]][]).map(([cat, cfg]) => {
            const catExercises = grouped[cat];
            if (catExercises.length === 0) return null;
            return (
              <section key={cat}>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{cfg.emoji}</span>
                    <h2 className="text-sm font-bold text-black">{cfg.label}</h2>
                    <span className="text-2xs text-gray-400">{catExercises.length}</span>
                  </div>
                  <button
                    onClick={() => setActiveCategory(cat)}
                    className="flex items-center gap-0.5 text-2xs font-semibold text-orange"
                  >
                    Voir tout <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="space-y-2">
                  {catExercises.slice(0, 2).map((exercise) => (
                    <ExerciseCard key={exercise.id} exercise={exercise} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        // Vue liste filtrée
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">Aucun exercice trouvé</p>
              <button onClick={() => { setQuery(""); setActiveCategory(null); }} className="text-orange text-xs font-semibold mt-2">
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            filtered.map((exercise) => (
              <ExerciseCard key={exercise.id} exercise={exercise} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
