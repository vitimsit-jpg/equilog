import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import HistoriqueClient from "./HistoriqueClient";

export const dynamic = "force-dynamic";

export default async function HistoriquePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return notFound();

  const [{ data: horse }, { data: events }] = await Promise.all([
    supabase
      .from("horses")
      .select("id, name, sire_number, lieu_naissance, conditions_acquisition, historique_avant_acquisition")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("horse_history_events")
      .select("*")
      .eq("horse_id", params.id)
      .order("event_date", { ascending: false }),
  ]);

  if (!horse) return notFound();

  return (
    <HistoriqueClient
      horseId={params.id}
      horseName={horse.name}
      events={events || []}
      horseIdentite={{
        sire_number: (horse as any).sire_number ?? null,
        lieu_naissance: (horse as any).lieu_naissance ?? null,
        conditions_acquisition: (horse as any).conditions_acquisition ?? null,
        historique_avant_acquisition: (horse as any).historique_avant_acquisition ?? null,
      }}
    />
  );
}
