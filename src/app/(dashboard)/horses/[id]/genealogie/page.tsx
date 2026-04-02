import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import GeneaLogieClient from "./GeneaLogieClient";
import UpgradeBanner from "@/components/ui/UpgradeBanner";

export const dynamic = "force-dynamic";

export default async function GenealogiePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return notFound();

  const { data: userPlan } = await supabase.from("users").select("plan").eq("id", user.id).single();
  if ((userPlan?.plan ?? "starter") === "starter") return <UpgradeBanner feature="Généalogie" requiredPlan="pro" />;

  const [{ data: horse }, { data: pedigree }] = await Promise.all([
    supabase.from("horses").select("id, name, sire_number").eq("id", params.id).eq("user_id", user.id).single(),
    supabase.from("horse_pedigree").select("*").eq("horse_id", params.id).single(),
  ]);

  if (!horse) return notFound();

  return (
    <GeneaLogieClient
      horseId={params.id}
      horseName={horse.name}
      pedigree={pedigree || null}
    />
  );
}
