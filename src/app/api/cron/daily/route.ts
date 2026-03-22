import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendHealthReminder, sendScoreAlert } from "@/lib/email";
import { sendPushNotification } from "@/lib/webpush";
import { HEALTH_TYPE_LABELS } from "@/lib/utils";
import { addDays, addMonths, addYears, format as formatDate } from "date-fns";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://equilog-i3nr-vitimsit-jpgs-projects.vercel.app";

function isAuthorized(request: NextRequest) {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const results = { healthReminders: 0, scoreAlerts: 0, rehabCompleted: 0, recurringBudget: 0, errors: 0 };

  // ── 1. Rappels soins J-7 ──────────────────────────────────────────────────
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + 7);
  const targetStr = targetDate.toISOString().split("T")[0];

  const { data: upcomingCares } = await supabase
    .from("health_records")
    .select("*, horses(id, name, user_id, users(email, name))")
    .eq("next_date", targetStr);

  for (const care of upcomingCares || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const horse = care.horses as any;
    const user = horse?.users;
    if (!user?.email || !horse?.name) continue;

    try {
      await sendHealthReminder({
        to: user.email,
        userName: user.name || "Cavalier",
        horseName: horse.name,
        careType: care.type,
        dueDate: new Date(care.next_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
      });
      results.healthReminders++;

      // Send push notifications
      const { data: pushSubs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", horse.user_id);

      for (const sub of pushSubs || []) {
        try {
          await sendPushNotification(sub, {
            title: `Rappel soin — ${horse.name}`,
            body: `${HEALTH_TYPE_LABELS[care.type] || care.type} prévu dans 7 jours`,
            url: `${APP_URL}/horses/${horse.id}/health`,
          });
        } catch (err: unknown) {
          // 410 Gone = subscription expired, delete it
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 410 || status === 404) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
        }
      }
    } catch {
      results.errors++;
    }
  }

  // ── 2. Alertes Horse Index en baisse ──────────────────────────────────────
  const { data: horses } = await supabase
    .from("horses")
    .select("id, name, user_id, users(email, name)");

  for (const horse of horses || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (horse as any).users;
    if (!user?.email) continue;

    const { data: scores } = await supabase
      .from("horse_scores")
      .select("score, computed_at")
      .eq("horse_id", horse.id)
      .order("computed_at", { ascending: false })
      .limit(2);

    if (!scores || scores.length < 2) continue;

    const [current, previous] = scores;
    const drop = previous.score - current.score;

    if (drop >= 5) {
      try {
        await sendScoreAlert({
          to: user.email,
          userName: user.name || "Cavalier",
          horseName: horse.name,
          horseId: horse.id,
          previousScore: previous.score,
          currentScore: current.score,
          drop,
        });
        results.scoreAlerts++;
      } catch {
        results.errors++;
      }
    }
  }

  // ── 3. IR fin de protocole ────────────────────────────────────────────────
  const { data: activeProtocols } = await supabase
    .from("rehab_protocols")
    .select("id, horse_id, user_id, phases, created_at, horses(id, name, users(email, name))")
    .eq("status", "active");

  const todayMs = new Date().setHours(0, 0, 0, 0);

  for (const protocol of activeProtocols || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const horse = (protocol as any).horses;
    const user = horse?.users;
    if (!horse || !user) continue;

    // Total duration from phases
    const phases = (protocol.phases as Array<{ duration_weeks: number }>) || [];
    const estimatedDays = phases.reduce((sum, p) => sum + (p.duration_weeks || 0) * 7, 0);
    if (estimatedDays === 0) continue;

    const startMs = new Date(protocol.created_at).setHours(0, 0, 0, 0);
    const endMs = startMs + estimatedDays * 24 * 60 * 60 * 1000;

    if (todayMs < endMs) continue; // not yet finished

    try {
      // Push notification — NEVER auto-complete, owner must act manually
      const { data: pushSubs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", protocol.user_id);

      for (const sub of pushSubs || []) {
        try {
          await sendPushNotification(sub, {
            title: `${horse.name} a terminé sa rééducation 🎉`,
            body: "Passer en mode Loisir ou Semi-actif ?",
            url: `${APP_URL}/horses/${horse.id}/training`,
          });
        } catch (err: unknown) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 410 || status === 404) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
        }
      }

      results.rehabCompleted++;
    } catch {
      results.errors++;
    }
  }

  // ── 4. Dépenses récurrentes ────────────────────────────────────────────────
  const todayStr = formatDate(today, "yyyy-MM-dd");

  const { data: templates } = await supabase
    .from("budget_entries")
    .select("*")
    .eq("is_recurring", true)
    .is("recurring_template_id", null);

  for (const template of templates || []) {
    try {
      const freq = template.recurrence_frequency;
      if (!freq) continue;

      // Toutes les occurrences déjà générées
      const { data: generated } = await supabase
        .from("budget_entries")
        .select("date")
        .eq("recurring_template_id", template.id);

      const existingDates = new Set([
        template.date,
        ...((generated || []).map((e: { date: string }) => e.date)),
      ]);

      // Générer toutes les échéances manquantes jusqu'à aujourd'hui
      let cursor = new Date(template.date);
      let safety = 0;
      while (safety++ < 1000) {
        // Avancer d'une période
        if (freq === "weekly")  cursor = addDays(cursor, 7);
        else if (freq === "monthly") cursor = addMonths(cursor, 1);
        else if (freq === "yearly")  cursor = addYears(cursor, 1);
        else break;

        const dateStr = formatDate(cursor, "yyyy-MM-dd");
        if (dateStr > todayStr) break; // pas encore dû
        if (existingDates.has(dateStr)) continue; // déjà généré

        await supabase.from("budget_entries").insert({
          horse_id: template.horse_id,
          date: dateStr,
          category: template.category,
          amount: template.amount,
          description: template.description,
          is_recurring: false,
          recurrence_frequency: null,
          recurring_template_id: template.id,
          media_urls: null,
        });

        existingDates.add(dateStr);
        results.recurringBudget++;
      }
    } catch {
      results.errors++;
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
