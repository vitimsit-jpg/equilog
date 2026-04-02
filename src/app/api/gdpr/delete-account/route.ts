import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function DELETE(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // Vérification mot de passe
  const { password } = await request.json().catch(() => ({ password: null }));
  if (!password) return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });

  const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email!, password });
  if (authError) return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 403 });

  const admin = createAdminClient();

  // Récupère les IDs des chevaux
  const { data: horses } = await admin
    .from("horses")
    .select("id")
    .eq("user_id", user.id);

  const horseIds = (horses ?? []).map((h: { id: string }) => h.id);

  // Supprime toutes les données identifiables (sauf budget_entries — obligation légale 10 ans)
  if (horseIds.length > 0) {
    const deleteResults = await Promise.allSettled([
      admin.from("health_records").delete().in("horse_id", horseIds),
      admin.from("training_sessions").delete().in("horse_id", horseIds),
      admin.from("training_planned_sessions").delete().in("horse_id", horseIds),
      admin.from("competitions").delete().in("horse_id", horseIds),
      admin.from("horse_nutrition").delete().in("horse_id", horseIds),
      admin.from("horse_daily_logs").delete().in("horse_id", horseIds),
      admin.from("horse_history_events").delete().in("horse_id", horseIds),
      admin.from("horse_scores").delete().in("horse_id", horseIds),
      admin.from("ai_insights").delete().in("horse_id", horseIds),
    ]);
    const failed = deleteResults.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      console.error("GDPR delete partial failure:", failed);
    }

    // Anonymise budget_entries avant de supprimer les chevaux
    // (obligation légale 10 ans : montant + date + catégorie conservés, identifiants supprimés)
    await admin
      .from("budget_entries")
      .update({ description: null, horse_id: null })
      .in("horse_id", horseIds);

    // Supprime les chevaux
    await admin.from("horses").delete().in("id", horseIds);
  }

  // Supprime les données liées au compte (hors chevaux)
  await Promise.all([
    admin.from("coach_students").delete().eq("coach_id", user.id),
    admin.from("horse_alerts").delete().eq("reporter_id", user.id),
  ]);

  // Marque le profil comme supprimé avant suppression définitive
  await admin.from("users").update({ deleted_at: new Date().toISOString() }).eq("id", user.id);

  // Envoie email de confirmation de suppression
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && user.email) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: "Equistra <noreply@equistra.com>",
          to: user.email,
          subject: "Votre compte Equistra a été supprimé",
          html: `<p>Bonjour,</p><p>Votre compte Equistra a bien été supprimé conformément à votre demande (Art. 17 RGPD).</p><p>Les données financières sont conservées de manière anonymisée pendant 10 ans (obligation légale, Art. 6.1.c RGPD).</p><p>Pour toute question : <a href="mailto:privacy@equistra.com">privacy@equistra.com</a></p>`,
        }),
      });
    }
  } catch {
    // Non bloquant
  }

  // Supprime le profil utilisateur
  await admin.from("users").delete().eq("id", user.id);

  // Supprime le compte auth (en dernier)
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: "Erreur lors de la suppression du compte" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
