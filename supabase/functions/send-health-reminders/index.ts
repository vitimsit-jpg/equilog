// Supabase Edge Function: send-health-reminders
// Scheduled via cron: every day at 8h
// Sends email reminders for upcoming health events at J-30, J-7, J-1

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const REMINDER_DAYS = [30, 7, 1];

interface HealthRecord {
  id: string;
  horse_id: string;
  type: string;
  next_date: string;
  horse: {
    name: string;
    user_id: string;
    user: {
      email: string;
      name: string;
    };
  };
}

const HEALTH_TYPE_LABELS: Record<string, string> = {
  vaccin: "Vaccin",
  vermifuge: "Vermifuge",
  dentiste: "Dentiste",
  osteo: "Ostéopathie",
  ferrage: "Parage",
  autre: "Soin",
};

async function sendEmail(to: string, subject: string, html: string) {
  // Using Supabase's built-in email or Resend/Sendgrid
  // For MVP: use Supabase auth admin email or a service like Resend
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.log(`[Mock Email] To: ${to}, Subject: ${subject}`);
    return;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Equilog <noreply@equilog.app>",
      to,
      subject,
      html,
    }),
  });
}

Deno.serve(async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const reminderDates = REMINDER_DAYS.map((days) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().substring(0, 10);
  });

  const { data: records, error } = await supabase
    .from("health_records")
    .select(`
      id, horse_id, type, next_date,
      horses!inner (
        name, user_id,
        users!inner (email, name)
      )
    `)
    .in("next_date", reminderDates);

  if (error) {
    console.error("Error fetching records:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;

  for (const record of (records as unknown as HealthRecord[]) || []) {
    const recordDate = new Date(record.next_date);
    const daysLeft = Math.round((recordDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const horse = record.horse;
    const user = horse.user;
    const typeName = HEALTH_TYPE_LABELS[record.type] || "Soin";

    const urgency = daysLeft <= 1 ? "🚨 URGENT" : daysLeft <= 7 ? "⚠️ Rappel" : "📅 Info";
    const subject = `${urgency} — ${typeName} pour ${horse.name} dans ${daysLeft}j`;

    const html = `
      <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto;">
        <div style="background: #1A1A1A; padding: 20px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 18px; font-weight: 900;">EQUILOG</h1>
        </div>
        <div style="background: #F5F0E8; padding: 24px; border-radius: 0 0 12px 12px;">
          <h2 style="color: #1A1A1A; font-size: 16px; margin: 0 0 8px;">Rappel : ${typeName} pour ${horse.name}</h2>
          <p style="color: #6B7280; font-size: 14px; margin: 0 0 16px;">
            Bonjour ${user.name},<br/><br/>
            Le <strong>${typeName}</strong> de <strong>${horse.name}</strong> est prévu dans <strong>${daysLeft} jour${daysLeft > 1 ? "s" : ""}</strong>
            (le ${new Date(record.next_date).toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}).
          </p>
          <a href="https://equilog.app/horses/${record.horse_id}/health"
             style="display: inline-block; background: #E8440A; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;">
            Voir le carnet de santé →
          </a>
        </div>
        <p style="color: #9CA3AF; font-size: 11px; text-align: center; margin-top: 12px;">
          Equilog · Le Strava du cheval · <a href="https://equilog.app/settings" style="color: #9CA3AF;">Se désabonner</a>
        </p>
      </div>
    `;

    await sendEmail(user.email, subject, html);
    sent++;
  }

  return new Response(JSON.stringify({ success: true, sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
