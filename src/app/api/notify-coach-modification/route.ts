import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushNotification } from "@/lib/webpush";
import { createNotification } from "@/lib/notifications";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://equilog-i3nr-vitimsit-jpgs-projects.vercel.app";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { horseId, element } = await req.json();
  if (!horseId) return NextResponse.json({ error: "horseId required" }, { status: 400 });

  // Get horse + owner
  const { data: horse } = await supabase
    .from("horses")
    .select("id, name, user_id")
    .eq("id", horseId)
    .single();

  if (!horse) return NextResponse.json({ error: "Horse not found" }, { status: 404 });

  // Current user is the owner — no notification needed
  if (horse.user_id === user.id) return NextResponse.json({ ok: true, skipped: true });

  // Get coach name
  const { data: coach } = await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .single();

  const coachName = coach?.name || "Votre coach";
  const elementLabel = element || "une séance";

  const admin = createAdminClient();

  // Stocker en DB pour le panel notifications
  await createNotification(admin, horse.user_id, {
    type: "coach_modification",
    title: `${coachName} a modifié ${elementLabel}`,
    body: `Concernant ${horse.name}`,
    url: `/horses/${horse.id}/training`,
  });

  const { data: pushSubs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", horse.user_id);

  for (const sub of pushSubs || []) {
    try {
      await sendPushNotification(sub, {
        title: `${coachName} a modifié ${elementLabel}`,
        body: `Concernant ${horse.name}`,
        url: `${APP_URL}/horses/${horse.id}/training`,
      });
    } catch (err: unknown) {
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 410 || status === 404) {
        await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
