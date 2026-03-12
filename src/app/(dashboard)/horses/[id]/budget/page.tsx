import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import BudgetDashboard from "@/components/budget/BudgetDashboard";

interface Props {
  params: { id: string };
}

export default async function BudgetPage({ params }: Props) {
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

  const { data: entries } = await supabase
    .from("budget_entries")
    .select("*")
    .eq("horse_id", horse.id)
    .order("date", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <BudgetDashboard entries={entries || []} horseId={horse.id} />
    </div>
  );
}
