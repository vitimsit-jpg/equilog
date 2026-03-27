import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import NutritionSetup from "@/components/nutrition/NutritionSetup";
import NutritionView from "@/components/nutrition/NutritionView";
import type { HorseNutrition, NutritionHistoryEntry } from "@/lib/supabase/types";

interface Props {
  params: { id: string };
}

export default async function NutritionPage({ params }: Props) {
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

  // Module not activated
  if (!(horse as any).module_nutrition) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="card flex flex-col items-center text-center gap-5 py-12 px-6">
          <div className="w-16 h-16 rounded-2xl bg-beige flex items-center justify-center text-3xl">🥕</div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-black">Module Nutrition</h2>
            <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
              Activez le module Nutrition dans les réglages de{" "}
              <strong>{horse.name}</strong> pour suivre sa ration et ses compléments.
            </p>
          </div>
          <Link href={`/horses/${horse.id}`} className="btn-primary px-6 py-3 text-sm font-bold">
            Activer depuis les réglages →
          </Link>
        </div>
      </div>
    );
  }

  const [{ data: rawNutrition }, { data: rawHistory }] = await Promise.all([
    supabase
      .from("horse_nutrition")
      .select("*")
      .eq("horse_id", horse.id)
      .maybeSingle(),
    supabase
      .from("nutrition_history")
      .select("*")
      .eq("horse_id", horse.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const nutrition = rawNutrition as HorseNutrition | null;
  const history = (rawHistory || []) as NutritionHistoryEntry[];

  // First time — show setup form
  if (!nutrition) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-black">Configurer la ration</h2>
          <p className="text-sm text-gray-400 mt-1">
            Définissez la ration quotidienne de {horse.name}. Elle s&apos;appliquera automatiquement chaque jour.
          </p>
        </div>
        <NutritionSetup horseId={horse.id} existingNutrition={null} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <NutritionView
        horseId={horse.id}
        horseName={horse.name}
        nutrition={nutrition}
        history={history}
        horseMode={(horse as any).horse_index_mode ?? null}
        conditionsVie={(horse as any).conditions_vie ?? null}
      />
    </div>
  );
}
