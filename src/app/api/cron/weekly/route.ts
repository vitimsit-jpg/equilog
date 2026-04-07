import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWeeklySummary } from "@/lib/email";
import { sendPushNotification } from "@/lib/webpush";

type PushSub = { user_id: string; endpoint: string; p256dh: string; auth: string };

function isAuthorized(request: NextRequest) {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const results = { summaries: 0, errors: 0 };

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];
  const todayStr = new Date().toISOString().split("T")[0];

  // ── Fetch 1 : tous les users avec email ─────────────────────────────────
  const { data: users } = await supabase
    .from("users")
    .select("id, email, name")
    .not("email", "is", null);

  const userIds = (users || []).map((u) => u.id);
  if (userIds.length === 0) return NextResponse.json({ ok: true, ...results });

  // ── Fetch 2 : tous les chevaux + toutes les données semaine en parallèle ─
  const { data: allHorses } = await supabase
    .from("horses")
    .select("id, name, user_id")
    .in("user_id", userIds);

  const allHorseIds = (allHorses || []).map((h) => h.id);
  if (allHorseIds.length === 0) return NextResponse.json({ ok: true, ...results });

  const [
    { data: allSessions },
    { data: allScores },
    { data: allPlanned },
    { data: allPushSubs },
  ] = await Promise.all([
    supabase
      .from("training_sessions")
      .select("horse_id, duration_min")
      .in("horse_id", allHorseIds)
      .gte("date", weekAgoStr),
    supabase
      .from("horse_scores")
      .select("horse_id, score, computed_at")
      .in("horse_id", allHorseIds)
      .order("computed_at", { ascending: false })
      .limit(allHorseIds.length * 10),
    supabase
      .from("training_planned_sessions")
      .select("horse_id, id, status")
      .in("horse_id", allHorseIds)
      .gte("date", weekAgoStr)
      .lte("date", todayStr),
    supabase
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth")
      .in("user_id", userIds),
  ]);

  // ── Groupements JS ────────────────────────────────────────────────────────
  const horsesByUser = groupBy(allHorses || [], (h) => h.user_id);
  const sessionsByHorse = groupBy(allSessions || [], (s) => s.horse_id);
  const plannedByHorse = groupBy(allPlanned || [], (p) => p.horse_id);
  const pushSubsByUser = groupBy((allPushSubs || []) as unknown as PushSub[], (s) => s.user_id);

  // Top 1 score par horse (allScores trié DESC)
  const latestScoreByHorse = (allScores || []).reduce<Record<string, number>>((acc, s) => {
    if (!(s.horse_id in acc)) acc[s.horse_id] = s.score;
    return acc;
  }, {});

  // ── Traitement par user — 0 requête DB ────────────────────────────────────
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://equilog-i3nr-vitimsit-jpgs-projects.vercel.app";

  for (const user of users || []) {
    if (!user.email) continue;

    const horses = horsesByUser[user.id] || [];
    if (horses.length === 0) continue;

    const horseSummaries = horses.map((horse) => {
      const sessions = sessionsByHorse[horse.id] || [];
      const planned = plannedByHorse[horse.id] || [];

      const plannedTotal = planned.length;
      const plannedSkipped = planned.filter((p) => p.status === "skipped").length;
      const denominator = plannedTotal - plannedSkipped + sessions.length;
      const completionPct =
        plannedTotal > 0 && denominator > 0
          ? Math.round((sessions.length / denominator) * 100)
          : null;

      return {
        name: horse.name,
        id: horse.id,
        sessionCount: sessions.length,
        totalMinutes: sessions.reduce((s, t) => s + (t.duration_min || 0), 0),
        score: latestScoreByHorse[horse.id] ?? null,
        completionPct,
      };
    });

    const totalSessions = horseSummaries.reduce((s, h) => s + h.sessionCount, 0);
    if (totalSessions === 0) continue;

    try {
      await sendWeeklySummary({
        to: user.email,
        userName: user.name || "Cavalier",
        horses: horseSummaries,
      });
      results.summaries++;

      const totalMin = horseSummaries.reduce((s, h) => s + h.totalMinutes, 0);
      for (const sub of pushSubsByUser[user.id] || []) {
        try {
          await sendPushNotification(sub, {
            title: "Résumé de la semaine",
            body: `${totalSessions} séance${totalSessions > 1 ? "s" : ""} · ${Math.floor(totalMin / 60)}h${totalMin % 60 > 0 ? `${totalMin % 60}min` : ""} cette semaine`,
            url: `${APP_URL}/dashboard`,
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

  return NextResponse.json({ ok: true, ...results });
}
