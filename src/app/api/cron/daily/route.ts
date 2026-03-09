import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendHealthReminder, sendScoreAlert } from "@/lib/email";

function isAuthorized(request: NextRequest) {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const results = { healthReminders: 0, scoreAlerts: 0, errors: 0 };

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

  return NextResponse.json({ ok: true, ...results });
}
