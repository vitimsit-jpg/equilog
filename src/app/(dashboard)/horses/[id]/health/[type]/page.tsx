import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import CareDetailPage from "@/components/health/CareDetailPage";
import type { HealthType } from "@/lib/supabase/types";

const VALID_TYPES: HealthType[] = [
  "vaccin", "vermifuge", "dentiste", "osteo", "ferrage", "veterinaire", "masseuse", "autre",
  "acupuncture", "physio_laser", "physio_ultrasons", "physio_tens", "pemf", "infrarouge",
  "cryotherapie", "thermotherapie", "pressotherapie", "ems", "bandes_repos",
  "etirements_passifs", "infiltrations", "mesotherapie",
  "balneotherapie", "water_treadmill", "tapis_marcheur", "ondes_choc",
];

interface Props {
  params: { id: string; type: string };
}

export default async function HealthDetailPage({ params }: Props) {
  if (!VALID_TYPES.includes(params.type as HealthType)) return notFound();
  const careType = params.type as HealthType;

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

  const [{ data: records }, { data: marechalProfile }] = await Promise.all([
    supabase
      .from("health_records")
      .select("*")
      .eq("horse_id", horse.id)
      .eq("type", careType)
      .order("date", { ascending: false })
      .limit(20),
    careType === "ferrage"
      ? supabase.from("horse_marechal_profile").select("*").eq("horse_id", horse.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <CareDetailPage
      horseId={horse.id}
      horseName={horse.name}
      horseMode={(horse as any).horse_index_mode ?? null}
      type={careType}
      records={records ?? []}
      marechalProfile={marechalProfile ?? null}
    />
  );
}
