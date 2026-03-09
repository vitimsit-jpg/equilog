import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import HealthTimeline from "@/components/health/HealthTimeline";
import AddHealthEventButton from "@/components/health/AddHealthEventButton";
import PdfDownloadButton from "@/components/pdf/PdfDownloadButton";

interface Props {
  params: { id: string };
}

export default async function HealthPage({ params }: Props) {
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

  const { data: records } = await supabase
    .from("health_records")
    .select("*")
    .eq("horse_id", horse.id)
    .order("date", { ascending: false });

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/horses/${horse.id}`} className="btn-ghost p-2">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-black">Carnet de santé</h1>
            <p className="text-sm text-gray-400">{horse.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PdfDownloadButton type="sante" horse={horse} records={records || []} />
          <AddHealthEventButton horseId={horse.id} />
        </div>
      </div>

      <HealthTimeline records={records || []} horseId={horse.id} />
    </div>
  );
}
