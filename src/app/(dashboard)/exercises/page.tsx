/**
 * BIBL-25 — Bibliothèque d'exercices
 * Page d'accueil : 5 catégories + favoris + recherche
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Exercise } from "@/lib/supabase/types";
import ExerciseLibraryClient from "@/components/exercises/ExerciseLibraryClient";

interface SearchParams {
  q?: string;
  category?: string;
  horseId?: string;
}

interface Props {
  searchParams: SearchParams;
}

export default async function ExercisesPage({ searchParams }: Props) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Récupérer tous les exercices
  const { data: exercises } = await supabase
    .from("exercises")
    .select("*")
    .order("category")
    .order("title");

  // Récupérer les favoris de l'utilisateur
  const { data: favorites } = await supabase
    .from("user_exercise_favorites")
    .select("exercise_id")
    .eq("user_id", user.id);

  const favoriteIds = new Set((favorites || []).map((f) => f.exercise_id));

  return (
    <ExerciseLibraryClient
      exercises={(exercises || []) as Exercise[]}
      favoriteIds={favoriteIds}
      userId={user.id}
      horseId={searchParams.horseId}
      initialCategory={searchParams.category}
      initialQuery={searchParams.q}
    />
  );
}
