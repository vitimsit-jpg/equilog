import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import TrainingDashboard from "@/components/training/TrainingDashboard";
import TrainingPlanCard from "@/components/training/TrainingPlanCard";
import PdfDownloadButton from "@/components/pdf/PdfDownloadButton";

interface Props {
  params: { id: string };
}

export default async function TrainingPage({ params }: Props) {
  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return notFound();

  const { data: horse } = await supabase
    .from("horses")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", authUser.id)
    .single();

  if (!horse) return notFound();

  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [
    { data: sessions },
    { data: yearHealth },
    { data: yearCompetitions },
    { data: yearBudget },
  ] = await Promise.all([
    supabase
      .from("training_sessions")
      .select("*")
      .eq("horse_id", horse.id)
      .order("date", { ascending: false }),
    supabase
      .from("health_records")
      .select("id, type, date, cost")
      .eq("horse_id", horse.id)
      .gte("date", yearStart),
    supabase
      .from("competitions")
      .select("id, date, event_name, discipline, result_rank, total_riders")
      .eq("horse_id", horse.id)
      .gte("date", yearStart),
    supabase
      .from("budget_entries")
      .select("id, date, category, amount, description")
      .eq("horse_id", horse.id)
      .gte("date", yearStart),
  ]);

  const [{ data: latestInsight }, { data: latestPlan }] = await Promise.all([
    supabase
      .from("ai_insights")
      .select("*")
      .eq("horse_id", horse.id)
      .eq("type", "weekly")
      .order("generated_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("ai_insights")
      .select("*")
      .eq("horse_id", horse.id)
      .eq("type", "training_plan")
      .order("generated_at", { ascending: false })
      .limit(1)
      .single(),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-black">Journal de travail</h2>
        <div className="flex items-center gap-2">
          <PdfDownloadButton
            type="rapport"
            horse={horse}
            sessions={sessions || []}
          />
          <PdfDownloadButton
            type="bilan"
            horse={horse}
            sessions={sessions || []}
            records={yearHealth || []}
            competitions={yearCompetitions || []}
            budgetEntries={yearBudget || []}
          />
        </div>
      </div>

      <TrainingPlanCard horseId={horse.id} latestPlan={latestPlan ?? null} />

      <TrainingDashboard
        sessions={sessions || []}
        horseId={horse.id}
        latestInsight={latestInsight ?? null}
      />
    </div>
  );
}
