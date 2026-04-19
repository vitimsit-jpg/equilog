import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import BaladeTracker from "@/components/balade/BaladeTracker";
import BaladeHistory from "@/components/balade/BaladeHistory";
import type { BaladeTrack, TrainingSession } from "@/lib/supabase/types";

interface Props {
  params: { id: string };
}

export default async function BaladePage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return notFound();

  const { data: horse } = await supabase
    .from("horses")
    .select("id, name")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!horse) return notFound();

  // Fetch les balades GPS de ce cheval (sessions + tracks)
  const { data: tracks } = await supabase
    .from("balade_tracks")
    .select("id, training_session_id, horse_id, coordinates, distance_km, elevation_gain_m, avg_speed_kmh, started_at, finished_at")
    .eq("horse_id", horse.id)
    .order("started_at", { ascending: false })
    .limit(20);

  // Fetch les sessions liées
  const trackSessionIds = (tracks || []).map((t) => (t as unknown as BaladeTrack).training_session_id);
  const { data: sessions } = trackSessionIds.length > 0
    ? await supabase
        .from("training_sessions")
        .select("id, date, duration_min, intensity, feeling, notes")
        .in("id", trackSessionIds)
        .is("deleted_at", null)
    : { data: [] };

  // Combiner tracks + sessions
  const sessionsById = new Map((sessions || []).map((s) => [s.id, s]));
  const balades = (tracks || [])
    .map((t) => {
      const track = t as unknown as BaladeTrack;
      const session = sessionsById.get(track.training_session_id);
      if (!session) return null;
      return { track, session: session as unknown as TrainingSession };
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <BaladeTracker horseId={horse.id} horseName={horse.name} />

      {/* Historique des balades */}
      <div className="border-t border-gray-100 pt-6">
        <BaladeHistory balades={balades} />
      </div>
    </div>
  );
}
