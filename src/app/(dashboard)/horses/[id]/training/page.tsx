import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import TrainingDashboard from "@/components/training/TrainingDashboard";
import TrainingPlanCard from "@/components/training/TrainingPlanCard";

interface Props {
  params: { id: string };
}

export default async function TrainingPage({ params }: Props) {
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

  const { data: sessions } = await supabase
    .from("training_sessions")
    .select("*")
    .eq("horse_id", horse.id)
    .order("date", { ascending: false });

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
      <div className="flex items-center gap-3">
        <Link href={`/horses/${horse.id}`} className="btn-ghost p-2">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-black">Journal de travail</h1>
          <p className="text-sm text-gray-400">{horse.name}</p>
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
