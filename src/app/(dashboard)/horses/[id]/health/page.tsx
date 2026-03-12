import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import HealthOverview from "@/components/health/HealthOverview";
import PdfDownloadButton from "@/components/pdf/PdfDownloadButton";

interface Props {
  params: { id: string };
}

export default async function HealthPage({ params }: Props) {
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

  const { data: records } = await supabase
    .from("health_records")
    .select("*")
    .eq("horse_id", horse.id)
    .order("date", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-black">Carnet de santé</h2>
        <PdfDownloadButton type="sante" horse={horse} records={records || []} />
      </div>

      <HealthOverview records={records || []} horseId={horse.id} />
    </div>
  );
}
