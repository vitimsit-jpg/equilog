import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function DELETE() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();

  // Récupère les IDs des chevaux
  const { data: horses } = await admin
    .from("horses")
    .select("id")
    .eq("user_id", user.id);

  const horseIds = (horses ?? []).map((h: { id: string }) => h.id);

  // Supprime toutes les données identifiables (sauf budget_entries — obligation légale 10 ans)
  if (horseIds.length > 0) {
    await Promise.all([
      admin.from("health_records").delete().in("horse_id", horseIds),
      admin.from("training_sessions").delete().in("horse_id", horseIds),
      admin.from("training_planned_sessions").delete().in("horse_id", horseIds),
      admin.from("competitions").delete().in("horse_id", horseIds),
      admin.from("horse_nutrition").delete().in("horse_id", horseIds),
      admin.from("horse_daily_logs").delete().in("horse_id", horseIds),
      admin.from("horse_history_events").delete().in("horse_id", horseIds),
      admin.from("horse_scores").delete().in("horse_id", horseIds),
      admin.from("ai_insights").delete().in("horse_id", horseIds),
      // Anonymise budget_entries : retire horse_id et description (obligation légale : montant + date conservés)
      admin.from("budget_entries").update({ description: null }).in("horse_id", horseIds),
    ]);

    // Supprime les chevaux
    await admin.from("horses").delete().in("id", horseIds);
  }

  // Supprime les données liées au compte (hors chevaux)
  await Promise.all([
    admin.from("coach_students").delete().eq("coach_id", user.id),
    admin.from("horse_alerts").delete().eq("reporter_id", user.id),
  ]);

  // Anonymise les budget_entries orphelines (plus de horse_id)
  // Supprime le profil utilisateur
  await admin.from("users").delete().eq("id", user.id);

  // Supprime le compte auth (en dernier)
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: "Erreur lors de la suppression du compte" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
