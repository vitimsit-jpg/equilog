import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }
  const {
    horse_id,
    coordinates,
    distance_km,
    elevation_gain_m,
    avg_speed_kmh,
    max_speed_kmh,
    started_at,
    finished_at,
    duration_min,
    feeling,
    intensity,
    notes,
    media_urls,
  } = body;

  // Validation
  if (!horse_id || typeof horse_id !== "string") {
    return NextResponse.json({ error: "horse_id requis" }, { status: 400 });
  }
  if (!started_at || !finished_at || typeof started_at !== "string" || typeof finished_at !== "string") {
    return NextResponse.json({ error: "started_at et finished_at requis (ISO string)" }, { status: 400 });
  }
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return NextResponse.json({ error: "Au moins 2 points GPS requis" }, { status: 400 });
  }
  // Vérifier que les coordonnées ont lat/lng valides (sample les 3 premiers)
  for (const c of coordinates.slice(0, 3)) {
    if (typeof c.lat !== "number" || typeof c.lng !== "number" || c.lat < -90 || c.lat > 90 || c.lng < -180 || c.lng > 180) {
      return NextResponse.json({ error: "Coordonnées GPS invalides" }, { status: 400 });
    }
  }
  // Limiter la taille du payload (max 10000 points ~ balade de 8h)
  if (coordinates.length > 10000) {
    return NextResponse.json({ error: "Trop de points GPS (max 10000)" }, { status: 400 });
  }

  // Vérifier ownership du cheval
  const { data: horse } = await supabase
    .from("horses")
    .select("id")
    .eq("id", horse_id)
    .eq("user_id", user.id)
    .single();

  if (!horse) return NextResponse.json({ error: "Cheval introuvable" }, { status: 404 });

  // 1. Créer la training_session
  const { data: session, error: sessionError } = await supabase
    .from("training_sessions")
    .insert({
      horse_id,
      date: started_at.split("T")[0],
      type: "balade",
      duration_min: Math.max(1, Math.round(Number(duration_min) || 1)),
      intensity: Math.min(5, Math.max(1, Math.round(Number(intensity) || 3))) as 1 | 2 | 3 | 4 | 5,
      feeling: Math.min(5, Math.max(1, Math.round(Number(feeling) || 3))) as 1 | 2 | 3 | 4 | 5,
      notes: typeof notes === "string" ? notes.slice(0, 2000).trim() || null : null,
      media_urls: media_urls?.length ? media_urls : null,
      has_gps_track: true,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: "Erreur création session : " + (sessionError?.message ?? "unknown") },
      { status: 500 },
    );
  }

  // 2. Créer le balade_tracks
  const { data: track, error: trackError } = await supabase
    .from("balade_tracks")
    .insert({
      training_session_id: session.id,
      horse_id,
      user_id: user.id,
      coordinates,
      distance_km: typeof distance_km === "number" ? Math.round(distance_km * 100) / 100 : null,
      elevation_gain_m: typeof elevation_gain_m === "number" ? Math.round(elevation_gain_m * 10) / 10 : null,
      avg_speed_kmh: typeof avg_speed_kmh === "number" ? Math.min(200, Math.round(avg_speed_kmh * 10) / 10) : null,
      max_speed_kmh: typeof max_speed_kmh === "number" ? Math.min(200, Math.round(max_speed_kmh * 10) / 10) : null,
      started_at,
      finished_at,
    })
    .select("id")
    .single();

  if (trackError) {
    // Rollback : supprimer la session créée
    try {
      await supabase.from("training_sessions").delete().eq("id", session.id);
    } catch {
      // Rollback échoué — session orpheline, loggée pour debug
      console.error("Rollback failed for session:", session.id);
    }
    return NextResponse.json(
      { error: "Erreur création tracé : " + trackError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ session_id: session.id, track_id: track?.id });
}
