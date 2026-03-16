import { Resend } from "resend";

const FROM = "Equistra <onboarding@resend.dev>";
function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://equilog-i3nr-vitimsit-jpgs-projects.vercel.app";

// ── Types ─────────────────────────────────────────────────────────────────────

interface HealthReminderParams {
  to: string;
  userName: string;
  horseName: string;
  careType: string;
  dueDate: string;
}

interface ScoreAlertParams {
  to: string;
  userName: string;
  horseName: string;
  horseId: string;
  previousScore: number;
  currentScore: number;
  drop: number;
}

interface HorseSummary {
  name: string;
  id: string;
  sessionCount: number;
  totalMinutes: number;
  score: number | null;
}

interface WeeklySummaryParams {
  to: string;
  userName: string;
  horses: HorseSummary[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function base(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Equistra</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#FF6B35;padding:24px 32px;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">🐴 Equistra</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #f0f0f0;">
            <p style="margin:0;font-size:12px;color:#999;">
              Vous recevez cet email car vous utilisez Equistra.<br/>
              <a href="${APP_URL}/settings" style="color:#FF6B35;text-decoration:none;">Gérer mes préférences</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#FF6B35;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${label}</a>`;
}

// ── Emails ────────────────────────────────────────────────────────────────────

export async function sendHealthReminder(p: HealthReminderParams) {
  const careLabel = p.careType.charAt(0).toUpperCase() + p.careType.slice(1);

  const html = base(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111;">Rappel soin — ${p.horseName}</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#666;">Bonjour ${p.userName},</p>
    <div style="background:#fff8f5;border-left:4px solid #FF6B35;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;font-size:15px;font-weight:600;color:#111;">${careLabel}</p>
      <p style="margin:4px 0 0;font-size:14px;color:#666;">Prévu le <strong>${p.dueDate}</strong> pour <strong>${p.horseName}</strong></p>
    </div>
    <p style="margin:0;font-size:14px;color:#444;line-height:1.6;">
      Ce soin arrive dans <strong>7 jours</strong>. Pensez à prendre rendez-vous si nécessaire.
    </p>
    ${btn(`${APP_URL}/horses`, "Voir le carnet de santé")}
  `);

  return getResend().emails.send({
    from: FROM,
    to: p.to,
    subject: `🗓️ Rappel : ${p.careType} de ${p.horseName} dans 7 jours`,
    html,
  });
}

export async function sendScoreAlert(p: ScoreAlertParams) {
  const html = base(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111;">Baisse du Horse Index — ${p.horseName}</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#666;">Bonjour ${p.userName},</p>
    <div style="background:#fff5f5;border-left:4px solid #ef4444;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#666;">Horse Index de <strong>${p.horseName}</strong></p>
      <div style="display:flex;align-items:center;gap:12px;margin-top:8px;">
        <span style="font-size:28px;font-weight:700;color:#ef4444;">${p.currentScore}</span>
        <span style="font-size:14px;color:#999;">←</span>
        <span style="font-size:18px;font-weight:600;color:#999;text-decoration:line-through;">${p.previousScore}</span>
        <span style="font-size:13px;color:#ef4444;font-weight:600;">▼ ${p.drop} pts</span>
      </div>
    </div>
    <p style="margin:0;font-size:14px;color:#444;line-height:1.6;">
      Le score de <strong>${p.horseName}</strong> a baissé de <strong>${p.drop} points</strong>.
      Consultez le détail pour identifier les axes d'amélioration.
    </p>
    ${btn(`${APP_URL}/horses/${p.horseId}`, "Voir le Horse Index")}
  `);

  return getResend().emails.send({
    from: FROM,
    to: p.to,
    subject: `📉 Horse Index de ${p.horseName} en baisse (−${p.drop} pts)`,
    html,
  });
}

export async function sendWelcomeEmail(p: { to: string; userName: string }) {
  const html = base(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111;">Bienvenue sur Equistra, ${p.userName} !</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#666;">Vous avez créé votre compte — votre carnet de bord équestre vous attend.</p>
    <div style="background:#fff8f5;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#111;text-transform:uppercase;letter-spacing:0.5px;">Ce que vous pouvez faire :</p>
      <ul style="margin:0;padding-left:18px;font-size:14px;color:#444;line-height:2;">
        <li>Créer le profil de votre cheval</li>
        <li>Suivre les soins et vaccins dans le carnet de santé</li>
        <li>Enregistrer vos séances de travail</li>
        <li>Visualiser le Horse Index — le score de forme global</li>
      </ul>
    </div>
    ${btn(`${APP_URL}/horses/new`, "Ajouter mon premier cheval")}
  `);

  return getResend().emails.send({
    from: FROM,
    to: p.to,
    subject: "Bienvenue sur Equistra !",
    html,
  });
}

export async function sendWeeklySummary(p: WeeklySummaryParams) {
  const totalSessions = p.horses.reduce((s, h) => s + h.sessionCount, 0);
  const totalMinutes = p.horses.reduce((s, h) => s + h.totalMinutes, 0);

  const horsesRows = p.horses
    .filter((h) => h.sessionCount > 0)
    .map(
      (h) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
          <p style="margin:0;font-size:14px;font-weight:600;color:#111;">${h.name}</p>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:center;">
          <span style="font-size:14px;color:#444;">${h.sessionCount} séance${h.sessionCount > 1 ? "s" : ""}</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:center;">
          <span style="font-size:14px;color:#444;">${h.totalMinutes} min</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:right;">
          ${h.score !== null ? `<span style="font-size:14px;font-weight:700;color:#FF6B35;">${h.score}<span style="font-size:11px;font-weight:400;color:#999;">/100</span></span>` : '<span style="font-size:13px;color:#ccc;">—</span>'}
        </td>
      </tr>`
    )
    .join("");

  const html = base(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111;">Résumé de la semaine</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#666;">Bonjour ${p.userName},</p>

    <div style="display:flex;gap:12px;margin-bottom:28px;">
      <div style="flex:1;background:#fff8f5;border-radius:10px;padding:16px;text-align:center;">
        <p style="margin:0;font-size:28px;font-weight:700;color:#FF6B35;">${totalSessions}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.5px;">séance${totalSessions > 1 ? "s" : ""}</p>
      </div>
      <div style="flex:1;background:#f5f5ff;border-radius:10px;padding:16px;text-align:center;">
        <p style="margin:0;font-size:28px;font-weight:700;color:#6366f1;">${totalMinutes}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.5px;">minutes</p>
      </div>
      <div style="flex:1;background:#f5fff8;border-radius:10px;padding:16px;text-align:center;">
        <p style="margin:0;font-size:28px;font-weight:700;color:#22c55e;">${p.horses.length}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.5px;">cheval${p.horses.length > 1 ? "x" : ""}</p>
      </div>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <thead>
        <tr>
          <th style="padding:8px 0;text-align:left;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Cheval</th>
          <th style="padding:8px 0;text-align:center;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Séances</th>
          <th style="padding:8px 0;text-align:center;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Durée</th>
          <th style="padding:8px 0;text-align:right;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Index</th>
        </tr>
      </thead>
      <tbody>${horsesRows}</tbody>
    </table>

    ${btn(`${APP_URL}/dashboard`, "Voir mon tableau de bord")}
  `);

  return getResend().emails.send({
    from: FROM,
    to: p.to,
    subject: `📊 Résumé Equistra — ${totalSessions} séance${totalSessions > 1 ? "s" : ""} cette semaine`,
    html,
  });
}
