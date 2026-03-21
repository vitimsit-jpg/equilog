import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import CompetitionsDashboard from "@/components/competitions/CompetitionsDashboard";

interface Props {
  params: { id: string };
}

export default async function CompetitionsPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return notFound();

  const { data: horse } = await supabase
    .from("horses")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", authUser.id)
    .single();

  if (!horse) return notFound();

  const [{ data: competitions }, { data: linkedSessions }] = await Promise.all([
    supabase
      .from("competitions")
      .select("*")
      .eq("horse_id", horse.id)
      .order("date", { ascending: false }),
    supabase
      .from("training_sessions")
      .select("linked_competition_id")
      .eq("horse_id", horse.id)
      .not("linked_competition_id", "is", null),
  ]);

  const linkedSessionCompetitionIds = new Set<string>(
    (linkedSessions || []).map((s) => s.linked_competition_id as string)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <CompetitionsDashboard
        competitions={competitions || []}
        horse={horse}
        linkedSessionCompetitionIds={linkedSessionCompetitionIds}
      />
    </div>
  );
}
