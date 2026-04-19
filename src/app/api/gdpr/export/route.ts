import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();

  // 1. Profile
  const { data: profile } = await admin
    .from("users")
    .select("id, email, name, plan, profile_type, user_type, created_at")
    .eq("id", user.id)
    .single();

  // 2. Horses
  const { data: horses } = await admin
    .from("horses")
    .select("*")
    .eq("user_id", user.id);

  const horseIds = (horses ?? []).map((h: { id: string }) => h.id);

  if (horseIds.length === 0) {
    const exportData = {
      exported_at: new Date().toISOString(),
      schema_version: "1.0",
      profil: profile,
      chevaux: [],
    };
    return buildResponse(exportData);
  }

  // 3. All horse data in parallel
  const [
    { data: health },
    { data: training },
    { data: planned },
    { data: competitions },
    { data: budget },
    { data: nutrition },
    { data: dailyLogs },
    { data: historyEvents },
  ] = await Promise.all([
    admin.from("health_records").select("*").in("horse_id", horseIds),
    admin.from("training_sessions").select("*").in("horse_id", horseIds).is("deleted_at", null),
    admin.from("training_planned_sessions").select("*").in("horse_id", horseIds).is("deleted_at", null),
    admin.from("competitions").select("*").in("horse_id", horseIds),
    admin.from("budget_entries").select("*").in("horse_id", horseIds),
    admin.from("horse_nutrition").select("*").in("horse_id", horseIds),
    admin.from("horse_daily_logs").select("*").in("horse_id", horseIds),
    admin.from("horse_history_events").select("*").in("horse_id", horseIds),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    schema_version: "1.0",
    profil: profile,
    chevaux: (horses ?? []).map((horse: Record<string, unknown>) => ({
      ...horse,
      sante: (health ?? []).filter((r: { horse_id: string }) => r.horse_id === horse.id),
      journal_travail: (training ?? []).filter((s: { horse_id: string }) => s.horse_id === horse.id),
      planning: (planned ?? []).filter((p: { horse_id: string }) => p.horse_id === horse.id),
      concours: (competitions ?? []).filter((c: { horse_id: string }) => c.horse_id === horse.id),
      budget: (budget ?? []).filter((b: { horse_id: string }) => b.horse_id === horse.id),
      nutrition: (nutrition ?? []).find((n: { horse_id: string }) => n.horse_id === horse.id) ?? null,
      journal_quotidien: (dailyLogs ?? []).filter((d: { horse_id: string }) => d.horse_id === horse.id),
      historique_medical: (historyEvents ?? []).filter((h: { horse_id: string }) => h.horse_id === horse.id),
    })),
  };

  return buildResponse(exportData);
}

function buildResponse(data: unknown) {
  const json = JSON.stringify(data, null, 2);
  const filename = `equilog-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
