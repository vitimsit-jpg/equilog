import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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

  const { data: competitions } = await supabase
    .from("competitions")
    .select("*")
    .eq("horse_id", horse.id)
    .order("date", { ascending: false });

  const { data: healthRecords } = await supabase
    .from("health_records")
    .select("*")
    .eq("horse_id", horse.id)
    .order("date", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href={`/horses/${horse.id}`} className="btn-ghost p-2">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-black">Concours</h1>
          <p className="text-sm text-gray-400">{horse.name}</p>
        </div>
      </div>

      <CompetitionsDashboard
        competitions={competitions || []}
        healthRecords={healthRecords || []}
        horse={horse}
      />
    </div>
  );
}
