import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import HistoriqueClient from "./HistoriqueClient";

export const dynamic = "force-dynamic";

export default async function HistoriquePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return notFound();

  const [{ data: horse }, { data: events }] = await Promise.all([
    supabase.from("horses").select("id, name").eq("id", params.id).eq("user_id", user.id).single(),
    supabase.from("horse_history_events")
      .select("*")
      .eq("horse_id", params.id)
      .order("event_date", { ascending: false }),
  ]);

  if (!horse) return notFound();

  return <HistoriqueClient horseId={params.id} events={events || []} />;
}
