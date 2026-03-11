import { Resend } from "resend";

function getResend() {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY not set");
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = "Equistra <onboarding@resend.dev>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://equilog-i3nr-vitimsit-jpgs-projects.vercel.app";

// ── Health reminder J-7 ──────────────────────────────────────────────────────

export async function sendHealthReminder(params: {
  to: string;
  userName: string;
  horseName: string;
  careType: string;
  dueDate: string;
}) {
  const { to, userName, horseName, careType, dueDate } = params;
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `⏰ Rappel soins — ${horseName} dans 7 jours`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#FAFAF8;padding:32px 16px">
        <div style="background:white;border-radius:16px;padding:32px;border:1px solid #f0ede8">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
            <div style="width:28px;height:28px;background:black;border-radius:8px;display:flex;align-items:center;justify-content:center">
              <span style="color:white;font-weight:900;font-size:12px">E</span>
            </div>
            <span style="font-weight:900;font-size:16px;color:black">EQUISTRA</span>
          </div>
          <h2 style="font-size:20px;font-weight:900;color:black;margin:0 0 8px">Rappel soins J-7</h2>
          <p style="color:#6b7280;margin:0 0 24px">Bonjour ${userName},</p>
          <div style="background:#FFF8F4;border:1px solid #FDDCB5;border-radius:12px;padding:20px;margin-bottom:24px">
            <p style="margin:0;font-size:15px;color:black">
              <strong>${horseName}</strong> a un soin prévu dans <strong>7 jours</strong> :
            </p>
            <p style="margin:8px 0 0;font-size:20px;font-weight:900;color:#E87E35">${careType}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#9ca3af">Échéance : ${dueDate}</p>
          </div>
          <a href="${SITE_URL}/horses" style="display:inline-block;background:black;color:white;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none">
            Voir la fiche de ${horseName}
          </a>
        </div>
        <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px">
          Equistra · <a href="${SITE_URL}/settings" style="color:#9ca3af">Gérer mes notifications</a>
        </p>
      </div>
    `,
  });
}

// ── Score alert ──────────────────────────────────────────────────────────────

export async function sendScoreAlert(params: {
  to: string;
  userName: string;
  horseName: string;
  horseId: string;
  previousScore: number;
  currentScore: number;
  drop: number;
}) {
  const { to, userName, horseName, horseId, previousScore, currentScore, drop } = params;
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `📉 Horse Index en baisse — ${horseName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#FAFAF8;padding:32px 16px">
        <div style="background:white;border-radius:16px;padding:32px;border:1px solid #f0ede8">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
            <div style="width:28px;height:28px;background:black;border-radius:8px;display:flex;align-items:center;justify-content:center">
              <span style="color:white;font-weight:900;font-size:12px">E</span>
            </div>
            <span style="font-weight:900;font-size:16px;color:black">EQUISTRA</span>
          </div>
          <h2 style="font-size:20px;font-weight:900;color:black;margin:0 0 8px">Alerte Horse Index</h2>
          <p style="color:#6b7280;margin:0 0 24px">Bonjour ${userName},</p>
          <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:20px;margin-bottom:24px">
            <p style="margin:0;font-size:15px;color:black">
              Le Horse Index de <strong>${horseName}</strong> a baissé de <strong style="color:#ef4444">${drop} points</strong>.
            </p>
            <div style="display:flex;align-items:center;gap:16px;margin-top:16px">
              <div style="text-align:center">
                <p style="margin:0;font-size:28px;font-weight:900;color:#9ca3af">${previousScore}</p>
                <p style="margin:0;font-size:11px;color:#9ca3af">Avant</p>
              </div>
              <span style="font-size:20px;color:#ef4444">→</span>
              <div style="text-align:center">
                <p style="margin:0;font-size:28px;font-weight:900;color:#ef4444">${currentScore}</p>
                <p style="margin:0;font-size:11px;color:#9ca3af">Maintenant</p>
              </div>
            </div>
          </div>
          <a href="${SITE_URL}/horses/${horseId}" style="display:inline-block;background:black;color:white;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none">
            Voir le détail
          </a>
        </div>
        <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px">
          Equistra · <a href="${SITE_URL}/settings" style="color:#9ca3af">Gérer mes notifications</a>
        </p>
      </div>
    `,
  });
}

// ── Weekly summary ───────────────────────────────────────────────────────────

export async function sendWeeklySummary(params: {
  to: string;
  userName: string;
  horses: {
    name: string;
    id: string;
    sessionCount: number;
    totalMinutes: number;
    score: number | null;
  }[];
}) {
  const { to, userName, horses } = params;
  const totalSessions = horses.reduce((s, h) => s + h.sessionCount, 0);

  const horsesHtml = horses.map((h) => `
    <div style="padding:16px;border:1px solid #f0ede8;border-radius:12px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <p style="margin:0;font-size:15px;font-weight:700;color:black">${h.name}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#9ca3af">
            ${h.sessionCount} séance${h.sessionCount > 1 ? "s" : ""} · ${Math.round(h.totalMinutes / 60)}h de travail
          </p>
        </div>
        ${h.score !== null ? `<p style="margin:0;font-size:24px;font-weight:900;color:#E87E35">${h.score}</p>` : ""}
      </div>
    </div>
  `).join("");

  return getResend().emails.send({
    from: FROM,
    to,
    subject: `📊 Résumé hebdomadaire Equistra`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#FAFAF8;padding:32px 16px">
        <div style="background:white;border-radius:16px;padding:32px;border:1px solid #f0ede8">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
            <div style="width:28px;height:28px;background:black;border-radius:8px;display:flex;align-items:center;justify-content:center">
              <span style="color:white;font-weight:900;font-size:12px">E</span>
            </div>
            <span style="font-weight:900;font-size:16px;color:black">EQUISTRA</span>
          </div>
          <h2 style="font-size:20px;font-weight:900;color:black;margin:0 0 4px">Résumé de la semaine</h2>
          <p style="color:#6b7280;margin:0 0 24px">Bonjour ${userName}, voici l'activité de cette semaine.</p>
          <div style="background:#F9F7F4;border-radius:12px;padding:16px;text-align:center;margin-bottom:24px">
            <p style="margin:0;font-size:36px;font-weight:900;color:black">${totalSessions}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#9ca3af">séance${totalSessions > 1 ? "s" : ""} cette semaine</p>
          </div>
          ${horsesHtml}
          <a href="${SITE_URL}/dashboard" style="display:inline-block;background:black;color:white;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;margin-top:8px">
            Voir le dashboard
          </a>
        </div>
        <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px">
          Equistra · <a href="${SITE_URL}/settings" style="color:#9ca3af">Gérer mes notifications</a>
        </p>
      </div>
    `,
  });
}
