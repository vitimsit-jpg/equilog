import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushNotification } from "@/lib/webpush";
import { createNotification } from "@/lib/notifications";
import { TRAINING_TYPE_LABELS } from "@/lib/utils";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://equilog-i3nr-vitimsit-jpgs-projects.vercel.app";

type PushSub = { user_id: string; endpoint: string; p256dh: string; auth: string };

function isAuthorized(request: NextRequest) {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const results = { notified: 0, errors: 0 };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  // Fetch all planned sessions for tomorrow with horse + owner info
  const { data: planned } = await supabase
    .from("training_planned_sessions")
    .select("id, type, duration_min_target, horses(id, name, user_id)")
    .eq("date", tomorrowStr)
    .eq("status", "planned")
    .is("linked_session_id", null);

  if (!planned || planned.length === 0) {
    return NextResponse.json({ ok: true, ...results });
  }

  // Group by user_id in JS (no extra queries)
  const byUser: Record<string, { userId: string; horses: { id: string; name: string; sessions: typeof planned }[] }> = {};

  for (const p of planned) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const horse = p.horses as any;
    if (!horse?.user_id || !horse?.id) continue;

    const userId = horse.user_id as string;
    if (!byUser[userId]) byUser[userId] = { userId, horses: [] };

    const existing = byUser[userId].horses.find((h) => h.id === horse.id);
    if (existing) {
      existing.sessions.push(p);
    } else {
      byUser[userId].horses.push({ id: horse.id, name: horse.name, sessions: [p] });
    }
  }

  const userIds = Object.keys(byUser);
  if (userIds.length === 0) return NextResponse.json({ ok: true, ...results });

  // Batch fetch ALL push subscriptions for ALL users — 1 query instead of N
  const { data: allPushSubs } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  const pushSubsByUser = ((allPushSubs || []) as unknown as PushSub[]).reduce<Record<string, PushSub[]>>(
    (acc, sub) => {
      if (!acc[sub.user_id]) acc[sub.user_id] = [];
      acc[sub.user_id].push(sub);
      return acc;
    },
    {}
  );

  // Send notifications — only push delivery, no more DB reads in this loop
  for (const { userId, horses } of Object.values(byUser)) {
    const pushSubs = pushSubsByUser[userId] || [];
    if (pushSubs.length === 0) continue;

    for (const horse of horses) {
      const firstSession = horse.sessions[0];
      const typeLabel = TRAINING_TYPE_LABELS[firstSession.type] || firstSession.type;
      const extra = horse.sessions.length > 1 ? ` (+${horse.sessions.length - 1})` : "";
      const duration = firstSession.duration_min_target ? ` · ${firstSession.duration_min_target}min` : "";

      const payload = {
        title: `🏇 Séance prévue demain — ${horse.name}`,
        body: `${typeLabel}${extra}${duration}`,
        url: `${APP_URL}/horses/${horse.id}/training`,
      };

      // Stocker en DB pour le panel notifications
      await createNotification(supabase, userId, {
        type: "training_reminder",
        title: payload.title,
        body: payload.body,
        url: `/horses/${horse.id}/training`,
      });

      for (const sub of pushSubs) {
        try {
          await sendPushNotification(sub, payload);
          results.notified++;
        } catch (err: unknown) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 410 || status === 404) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          } else {
            results.errors++;
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true, tomorrowStr, ...results });
}
