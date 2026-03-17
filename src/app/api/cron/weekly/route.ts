import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWeeklySummary } from "@/lib/email";
import { sendPushNotification } from "@/lib/webpush";

function isAuthorized(request: NextRequest) {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
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

  // Get all users with their horses
  const { data: users } = await supabase
    .from("users")
    .select("id, email, name");

  for (const user of users || []) {
    if (!user.email) continue;

    const { data: horses } = await supabase
      .from("horses")
      .select("id, name")
      .eq("user_id", user.id);

    if (!horses || horses.length === 0) continue;

    const horseSummaries = await Promise.all(
      horses.map(async (horse) => {
        const [{ data: sessions }, { data: latestScore }] = await Promise.all([
          supabase
            .from("training_sessions")
            .select("duration_min")
            .eq("horse_id", horse.id)
            .gte("date", weekAgoStr),
          supabase
            .from("horse_scores")
            .select("score")
            .eq("horse_id", horse.id)
            .order("computed_at", { ascending: false })
            .limit(1),
        ]);

        return {
          name: horse.name,
          id: horse.id,
          sessionCount: sessions?.length ?? 0,
          totalMinutes: (sessions || []).reduce((s, t) => s + (t.duration_min || 0), 0),
          score: latestScore?.[0]?.score ?? null,
        };
      })
    );

    // Only send if there was activity this week
    const totalSessions = horseSummaries.reduce((s, h) => s + h.sessionCount, 0);
    if (totalSessions === 0) continue;

    try {
      await sendWeeklySummary({
        to: user.email,
        userName: user.name || "Cavalier",
        horses: horseSummaries,
      });
      results.summaries++;

      // Push notification résumé hebdo
      const { data: pushSubs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", user.id);

      const totalMin = horseSummaries.reduce((s, h) => s + h.totalMinutes, 0);
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://equilog-i3nr-vitimsit-jpgs-projects.vercel.app";

      for (const sub of pushSubs || []) {
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
