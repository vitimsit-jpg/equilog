import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendHealthReminder, sendScoreAlert } from "@/lib/email";
import { sendPushNotification } from "@/lib/webpush";
import { createNotification } from "@/lib/notifications";
import { HEALTH_TYPE_LABELS } from "@/lib/utils";
import { addDays, addMonths, addYears, format as formatDate } from "date-fns";
import { checkAndAwardBadge } from "@/lib/badges/award";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://equilog-i3nr-vitimsit-jpgs-projects.vercel.app";

type PushSub = { user_id: string; endpoint: string; p256dh: string; auth: string };

function isAuthorized(request: NextRequest) {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

function groupByUserId(subs: PushSub[] | null): Record<string, PushSub[]> {
  return (subs || []).reduce<Record<string, PushSub[]>>((acc, sub) => {
    if (!acc[sub.user_id]) acc[sub.user_id] = [];
    acc[sub.user_id].push(sub);
    return acc;
  }, {});
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const results = { healthReminders: 0, scoreAlerts: 0, rehabCompleted: 0, recurringBudget: 0, autoAnnulated: 0, longueDureeBadges: 0, errors: 0 };

  const today = new Date();
  const todayStr = formatDate(today, "yyyy-MM-dd");
  const targetDate = addDays(today, 7);
  const targetStr = formatDate(targetDate, "yyyy-MM-dd");
  const sevenDaysAgoStr = formatDate(addDays(today, -7), "yyyy-MM-dd");

  // ── Fetch initiale en parallèle (aucune requête dans les boucles après) ─────
  const [
    { data: upcomingCares },
    { data: horses },
    { data: activeProtocols },
    { data: templates },
    { data: expiredPlanned },
  ] = await Promise.all([
    supabase
      .from("health_records")
      .select("type, next_date, horses(id, name, user_id, users(email, name))")
      .eq("next_date", targetStr),
    supabase
      .from("horses")
      .select("id, name, user_id, users(email, name)"),
    supabase
      .from("rehab_protocols")
      .select("id, horse_id, user_id, phases, created_at, horses(id, name, users(email, name))")
      .eq("status", "active"),
    supabase
      .from("budget_entries")
      .select("id, horse_id, date, category, amount, description, recurrence_frequency")
      .eq("is_recurring", true)
      .is("recurring_template_id", null),
    // TRAV-26 §7 — Planned sessions périmées (J+7)
    supabase
      .from("training_planned_sessions")
      .select("id, horse_id, type, date, horses(id, name, user_id)")
      .eq("statut_planification", "planifiee")
      .is("deleted_at", null)
      .lt("date", sevenDaysAgoStr),
  ]);

  // Collecter tous les user_ids concernés pour batch fetch push_subscriptions
  const careUserIds = (upcomingCares || [])
    .map((c) => ((c.horses as unknown as { user_id: string } | null)?.user_id))
    .filter((id): id is string => !!id);

  const horseIds = (horses || []).map((h) => h.id);

  const protocolUserIds = (activeProtocols || [])
    .map((p) => p.user_id)
    .filter((id): id is string => !!id);

  const templateIds = (templates || []).map((t) => t.id);

  // Batch fetch secondaire en parallèle
  const [
    { data: carePushSubs },
    { data: allScores },
    { data: rehabPushSubs },
    { data: allGenerated },
  ] = await Promise.all([
    careUserIds.length
      ? supabase.from("push_subscriptions").select("user_id, endpoint, p256dh, auth").in("user_id", Array.from(new Set(careUserIds)))
      : Promise.resolve({ data: [] }),
    // × 5 : buffer pour que le tri global DESC couvre 5 entrées par cheval en moyenne
    // (sans DISTINCT ON supporté par Supabase, on sur-charge légèrement)
    horseIds.length
      ? supabase.from("horse_scores").select("horse_id, score, computed_at").in("horse_id", horseIds).order("computed_at", { ascending: false }).limit(horseIds.length * 5)
      : Promise.resolve({ data: [] }),
    protocolUserIds.length
      ? supabase.from("push_subscriptions").select("user_id, endpoint, p256dh, auth").in("user_id", Array.from(new Set(protocolUserIds)))
      : Promise.resolve({ data: [] }),
    templateIds.length
      ? supabase.from("budget_entries").select("date, recurring_template_id").in("recurring_template_id", templateIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Groupements JS
  const carePushByUser = groupByUserId(carePushSubs as unknown as PushSub[]);
  const rehabPushByUser = groupByUserId(rehabPushSubs as unknown as PushSub[]);

  // Top 2 scores par horse (les scores sont déjà triés DESC par computed_at)
  const scoresByHorse = (allScores || []).reduce<Record<string, { score: number; computed_at: string }[]>>(
    (acc, s) => {
      if (!acc[s.horse_id]) acc[s.horse_id] = [];
      if (acc[s.horse_id].length < 2) acc[s.horse_id].push(s);
      return acc;
    },
    {}
  );

  // Generated dates par template
  const generatedByTemplate = ((allGenerated || []) as unknown as { date: string; recurring_template_id: string }[])
    .reduce<Record<string, Set<string>>>((acc, e) => {
      if (!acc[e.recurring_template_id]) acc[e.recurring_template_id] = new Set();
      acc[e.recurring_template_id].add(e.date);
      return acc;
    }, {});

  // ── 1. Rappels soins J-7 ──────────────────────────────────────────────────
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
        dueDate: new Date(care.next_date ?? targetStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
      });
      results.healthReminders++;

      // Stocker en DB pour le panel notifications
      await createNotification(supabase, horse.user_id, {
        type: "health_reminder",
        title: `Rappel soin — ${horse.name}`,
        body: `${HEALTH_TYPE_LABELS[care.type] || care.type} prévu dans 7 jours`,
        url: `/horses/${horse.id}/health`,
      });

      for (const sub of carePushByUser[horse.user_id] || []) {
        try {
          await sendPushNotification(sub, {
            title: `Rappel soin — ${horse.name}`,
            body: `${HEALTH_TYPE_LABELS[care.type] || care.type} prévu dans 7 jours`,
            url: `${APP_URL}/horses/${horse.id}/health`,
          });
        } catch (err: unknown) {
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
  for (const horse of horses || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = (horse as any).users;
    if (!user?.email) continue;

    const scores = scoresByHorse[horse.id];
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

        // Stocker en DB pour le panel notifications
        await createNotification(supabase, horse.user_id, {
          type: "score_alert",
          title: `${horse.name} : score en baisse`,
          body: `Horse Index : ${previous.score} → ${current.score} (-${drop} pts)`,
          url: `/horses/${horse.id}`,
        });
      } catch {
        results.errors++;
      }
    }
  }

  // ── 3. IR fin de protocole ────────────────────────────────────────────────
  const todayMs = new Date().setHours(0, 0, 0, 0);

  for (const protocol of activeProtocols || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const horse = (protocol as any).horses;
    const user = horse?.users;
    if (!horse || !user) continue;

    const phases = (protocol.phases as Array<{ duration_weeks: number }>) || [];
    const estimatedDays = phases.reduce((sum, p) => sum + (p.duration_weeks || 0) * 7, 0);
    if (estimatedDays === 0) continue;

    const startMs = new Date(protocol.created_at).setHours(0, 0, 0, 0);
    const endMs = startMs + estimatedDays * 24 * 60 * 60 * 1000;
    if (todayMs < endMs) continue;

    try {
      // Stocker en DB pour le panel notifications
      await createNotification(supabase, protocol.user_id, {
        type: "rehab_complete",
        title: `${horse.name} a terminé sa rééducation 🎉`,
        body: "Passer en mode Loisir ou Semi-actif ?",
        url: `/horses/${horse.id}/training`,
      });

      for (const sub of rehabPushByUser[protocol.user_id] || []) {
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
  for (const template of templates || []) {
    try {
      const freq = template.recurrence_frequency;
      if (!freq) continue;

      const existingDates = new Set<string>([
        template.date,
        ...Array.from(generatedByTemplate[template.id] || new Set<string>()),
      ]);

      let cursor = new Date(template.date);
      let safety = 0;
      while (safety++ < 1000) {
        if (freq === "weekly")       cursor = addDays(cursor, 7);
        else if (freq === "monthly") cursor = addMonths(cursor, 1);
        else if (freq === "yearly")  cursor = addYears(cursor, 1);
        else break;

        const dateStr = formatDate(cursor, "yyyy-MM-dd");
        if (dateStr > todayStr) break;
        if (existingDates.has(dateStr)) continue;

        const { error: insertError } = await supabase.from("budget_entries").insert({
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

        if (insertError) { results.errors++; break; }
        existingDates.add(dateStr);
        results.recurringBudget++;
      }
    } catch {
      results.errors++;
    }
  }

  // ── 5. Auto-annulation J+7 (TRAV-26 Amendé §7) ─────────────────────────────
  if (expiredPlanned && expiredPlanned.length > 0) {
    const nowIso = new Date().toISOString();
    const expiredIds = expiredPlanned.map((p) => p.id);

    // Batch update toutes les planned périmées
    const { error: annulError } = await supabase
      .from("training_planned_sessions")
      .update({
        statut_planification: "annulee",
        annulee_auto_at: nowIso,
        deleted_at: nowIso,
      })
      .in("id", expiredIds);

    if (annulError) {
      console.error("[cron/daily] auto-annulation failed:", annulError.message);
      results.errors++;
    } else {
      results.autoAnnulated = expiredIds.length;

      // Grouper par user_id + horse pour notification consolidée
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const byUserHorse: Record<string, { userId: string; horseName: string; horseId: string; count: number }> = {};
      for (const p of expiredPlanned) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const horse = p.horses as any;
        if (!horse?.user_id) continue;
        const key = `${horse.user_id}:${horse.id}`;
        if (!byUserHorse[key]) {
          byUserHorse[key] = { userId: horse.user_id, horseName: horse.name, horseId: horse.id, count: 0 };
        }
        byUserHorse[key].count++;
      }

      // Fetch push subs pour les users concernés
      const annulUserIds = Array.from(new Set(Object.values(byUserHorse).map((v) => v.userId)));
      const { data: annulPushSubs } = annulUserIds.length
        ? await supabase.from("push_subscriptions").select("user_id, endpoint, p256dh, auth").in("user_id", annulUserIds)
        : { data: [] };
      const annulPushByUser = groupByUserId(annulPushSubs as unknown as PushSub[]);

      for (const entry of Object.values(byUserHorse)) {
        const title = `${entry.horseName} — ${entry.count} séance${entry.count > 1 ? "s" : ""} planifiée${entry.count > 1 ? "s" : ""} annulée${entry.count > 1 ? "s" : ""}`;
        const body = "Séances non réalisées depuis plus de 7 jours";

        try {
          await createNotification(supabase, entry.userId, {
            type: "other",
            title,
            body,
            url: `/horses/${entry.horseId}/training`,
          });

          for (const sub of annulPushByUser[entry.userId] || []) {
            try {
              await sendPushNotification(sub, { title, body, url: `${APP_URL}/horses/${entry.horseId}/training` });
            } catch (err: unknown) {
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
    }
  }

  // ── 6. Badges Longue Durée — un_an / trois_ans / cinq_ans_ensemble ─────────
  // Award basé sur l'âge depuis horse.created_at. Idempotent (UNIQUE upsert).
  const { data: horsesForBadges } = await supabase.from("horses").select("id, user_id, created_at");
  for (const h of horsesForBadges ?? []) {
    if (!h.created_at || !h.user_id) continue;
    const days = (today.getTime() - new Date(h.created_at).getTime()) / 86_400_000;
    try {
      if (days >= 365) {
        await checkAndAwardBadge(supabase, h.id, h.user_id, "un_an_ensemble");
        results.longueDureeBadges++;
      }
      if (days >= 1095) await checkAndAwardBadge(supabase, h.id, h.user_id, "trois_ans_ensemble");
      if (days >= 1825) await checkAndAwardBadge(supabase, h.id, h.user_id, "cinq_ans_ensemble");
    } catch {
      results.errors++;
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
