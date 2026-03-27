/**
 * BIBL-25 — Détail exercice
 * Schéma piste (pinch-to-zoom), objectifs, tags, bouton sticky "Ajouter à une séance"
 */

import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import type { Exercise } from "@/lib/supabase/types";
import ExerciseDetailClient from "@/components/exercises/ExerciseDetailClient";

interface Props {
  params: { id: string };
  searchParams: { horseId?: string };
}

export default async function ExerciseDetailPage({ params, searchParams }: Props) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: exercise } = await supabase
    .from("exercises")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!exercise) notFound();

  // Chevaux actifs de l'utilisateur (propriétaire ou gardien)
  const { data: horses } = await supabase
    .from("horses")
    .select("id, name, avatar_url, horse_index_mode")
    .neq("horse_index_mode", "IS")
    .order("name");

  // Favori ?
  const { data: fav } = await supabase
    .from("user_exercise_favorites")
    .select("exercise_id")
    .eq("user_id", user.id)
    .eq("exercise_id", params.id)
    .maybeSingle();

  return (
    <ExerciseDetailClient
      exercise={exercise as Exercise}
      isFavorite={!!fav}
      userId={user.id}
      horses={horses || []}
      defaultHorseId={searchParams.horseId}
    />
  );
}
