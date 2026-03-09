// Client-side only — do not import from server components
import jsPDF from "jspdf";

const BLACK = [0, 0, 0] as const;
const ORANGE = [232, 68, 10] as const;
const GRAY = [107, 114, 128] as const;
const LIGHT = [243, 244, 246] as const;
const WHITE = [255, 255, 255] as const;

const PAGE_W = 210;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;

function drawHeader(doc: jsPDF, horseName: string, docType: string) {
  // Black header bar
  doc.setFillColor(...BLACK);
  doc.rect(0, 0, PAGE_W, 22, "F");

  // EQUILOG
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.text("EQUILOG", MARGIN, 14);

  // Horse name + doc type
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text(`${horseName}  ·  ${docType}`, MARGIN + 32, 14);

  // Date
  const dateStr = new Date().toLocaleDateString("fr-FR");
  doc.text(dateStr, PAGE_W - MARGIN, 14, { align: "right" });
}

function drawFooter(doc: jsPDF, pageNum: number, total: number) {
  const y = 290;
  doc.setDrawColor(...LIGHT);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text("Généré par Equilog", MARGIN, y + 5);
  doc.text(`Page ${pageNum} / ${total}`, PAGE_W - MARGIN, y + 5, { align: "right" });
}

function sectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFillColor(...LIGHT);
  doc.rect(MARGIN, y, CONTENT_W, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BLACK);
  doc.text(title.toUpperCase(), MARGIN + 3, y + 5);
  return y + 11;
}

function labelValue(doc: jsPDF, label: string, value: string, x: number, y: number, colW: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text(label, x, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text(value || "—", x, y + 5);
  return y + 12;
}

// ──────────────────────────────────────────────
// FICHE CHEVAL
// ──────────────────────────────────────────────
export function generateFichePdf(
  horse: {
    name: string;
    breed?: string | null;
    discipline?: string | null;
    birth_year?: number | null;
    ecurie?: string | null;
    region?: string | null;
  },
  score: { score: number; score_breakdown?: Record<string, number> | null; computed_at: string } | null
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawHeader(doc, horse.name, "Fiche cheval");

  let y = 32;

  // Horse name big
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...BLACK);
  doc.text(horse.name, MARGIN, y);
  y += 8;

  if (horse.discipline || horse.breed) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GRAY);
    doc.text([horse.breed, horse.discipline].filter(Boolean).join(" · "), MARGIN, y);
    y += 8;
  }
  y += 4;

  // Profile section
  y = sectionTitle(doc, "Profil", y);
  const colW = CONTENT_W / 3;
  const row1y = y;

  labelValue(doc, "Race", horse.breed || "—", MARGIN, y, colW);
  labelValue(doc, "Discipline", horse.discipline || "—", MARGIN + colW, y, colW);
  labelValue(doc, "Année de naissance", horse.birth_year?.toString() || "—", MARGIN + colW * 2, y, colW);
  y = row1y + 14;

  labelValue(doc, "Écurie", horse.ecurie || "—", MARGIN, y, colW);
  labelValue(doc, "Région", horse.region || "—", MARGIN + colW, y, colW);
  y += 16;

  // Horse Index section
  if (score) {
    y = sectionTitle(doc, "Horse Index", y);

    // Big score
    doc.setFillColor(...BLACK);
    doc.roundedRect(MARGIN, y, 36, 28, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(...WHITE);
    doc.text(score.score.toString(), MARGIN + 18, y + 17, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("HORSE INDEX", MARGIN + 18, y + 23, { align: "center" });

    // Score label
    const label = score.score >= 85 ? "Excellent" : score.score >= 70 ? "Très bon" : score.score >= 55 ? "Bon" : score.score >= 40 ? "Moyen" : "À améliorer";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(`Calculé le ${new Date(score.computed_at).toLocaleDateString("fr-FR")}`, MARGIN + 42, y + 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(score.score >= 70 ? 22 : score.score >= 40 ? 217 : 220, score.score >= 70 ? 163 : score.score >= 40 ? 119 : 38, score.score >= 70 ? 74 : score.score >= 40 ? 6 : 38);
    doc.text(label, MARGIN + 42, y + 18);

    y += 34;

    // Breakdown
    const breakdown = score.score_breakdown as Record<string, number> | null;
    if (breakdown) {
      const dims: Record<string, string> = {
        sante: "Santé",
        activite: "Activité",
        performance: "Performance",
        regularite: "Régularité",
        bien_etre: "Bien-être",
      };
      const keys = Object.keys(dims).filter((k) => breakdown[k] !== undefined);
      if (keys.length > 0) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...GRAY);
        doc.text("Détail par dimension :", MARGIN, y);
        y += 5;

        const barW = CONTENT_W / keys.length - 4;
        keys.forEach((key, i) => {
          const val = Math.round(breakdown[key]);
          const x = MARGIN + i * (barW + 4);
          const maxBarH = 20;
          const barH = Math.max(1, (val / 100) * maxBarH);

          // Background bar
          doc.setFillColor(...LIGHT);
          doc.rect(x, y, barW, maxBarH, "F");

          // Filled bar
          doc.setFillColor(...ORANGE);
          doc.rect(x, y + maxBarH - barH, barW, barH, "F");

          // Value
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(...BLACK);
          doc.text(val.toString(), x + barW / 2, y + maxBarH - barH - 2, { align: "center" });

          // Label
          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.5);
          doc.setTextColor(...GRAY);
          doc.text(dims[key], x + barW / 2, y + maxBarH + 4, { align: "center" });
        });
        y += maxBarH + 10;
      }
    }
  }

  drawFooter(doc, 1, 1);
  doc.save(`${horse.name.replace(/\s+/g, "_")}_fiche.pdf`);
}

// ──────────────────────────────────────────────
// CARNET DE SANTÉ
// ──────────────────────────────────────────────
export function generateSantePdf(
  horse: { name: string; breed?: string | null; discipline?: string | null },
  records: Array<{
    id: string;
    type: string;
    date: string;
    next_date?: string | null;
    vet_name?: string | null;
    notes?: string | null;
  }>
) {
  const HEALTH_LABELS: Record<string, string> = {
    vaccin: "Vaccin", vermifuge: "Vermifuge", dentiste: "Dentiste",
    osteo: "Ostéopathie", ferrage: "Ferrage", autre: "Autre",
  };

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let pageNum = 1;
  const estimatedPages = Math.ceil((records.length * 8 + 80) / 260) || 1;

  drawHeader(doc, horse.name, "Carnet de santé");
  let y = 32;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...BLACK);
  doc.text("Carnet de santé", MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text(horse.name, MARGIN, y + 7);
  y += 18;

  // Stats row
  const today = new Date().toISOString().split("T")[0];
  const overdue = records.filter((r) => r.next_date && r.next_date < today).length;
  const upcoming = records.filter((r) => r.next_date && r.next_date >= today).length;

  doc.setFillColor(...LIGHT);
  doc.rect(MARGIN, y, CONTENT_W / 3 - 2, 14, "F");
  doc.rect(MARGIN + CONTENT_W / 3 + 2, y, CONTENT_W / 3 - 2, 14, "F");
  doc.rect(MARGIN + (CONTENT_W / 3) * 2 + 4, y, CONTENT_W / 3 - 4, 14, "F");

  [[records.length, "Soins total"], [overdue, "En retard"], [upcoming, "À venir"]].forEach(([val, lbl], i) => {
    const x = MARGIN + i * (CONTENT_W / 3 + 2) + (CONTENT_W / 3 - 2) / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(i === 1 && (val as number) > 0 ? 220 : 0, i === 1 && (val as number) > 0 ? 38 : 0, i === 1 && (val as number) > 0 ? 38 : 0);
    doc.text(String(val), x, y + 8, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(lbl as string, x, y + 13, { align: "center" });
  });
  y += 20;

  if (records.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GRAY);
    doc.text("Aucun soin enregistré.", MARGIN, y + 10);
    drawFooter(doc, 1, 1);
    doc.save(`${horse.name.replace(/\s+/g, "_")}_sante.pdf`);
    return;
  }

  y = sectionTitle(doc, "Historique des soins", y);

  // Table header
  const cols = [28, 36, 36, 32, 46];
  const headers = ["Date", "Type", "Prochain RDV", "Vétérinaire", "Notes"];
  doc.setFillColor(...BLACK);
  doc.rect(MARGIN, y, CONTENT_W, 7, "F");
  let cx = MARGIN + 2;
  headers.forEach((h, i) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    doc.text(h, cx, y + 5);
    cx += cols[i];
  });
  y += 7;

  records.forEach((rec, idx) => {
    if (y > 270) {
      drawFooter(doc, pageNum, estimatedPages);
      doc.addPage();
      pageNum++;
      drawHeader(doc, horse.name, "Carnet de santé");
      y = 30;
    }

    const rowH = 8;
    doc.setFillColor(idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250);
    doc.rect(MARGIN, y, CONTENT_W, rowH, "F");

    const dateStr = new Date(rec.date + "T00:00:00").toLocaleDateString("fr-FR");
    const nextStr = rec.next_date ? new Date(rec.next_date + "T00:00:00").toLocaleDateString("fr-FR") : "—";
    const typeLabel = HEALTH_LABELS[rec.type] || rec.type;
    const notes = rec.notes ? (rec.notes.length > 30 ? rec.notes.substring(0, 28) + "…" : rec.notes) : "—";

    const isOverdue = rec.next_date && rec.next_date < today;
    cx = MARGIN + 2;
    [dateStr, typeLabel, nextStr, rec.vet_name || "—", notes].forEach((val, i) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      if (i === 2 && isOverdue) {
        doc.setTextColor(220, 38, 38);
      } else {
        doc.setTextColor(...BLACK);
      }
      doc.text(val, cx, y + 5.5);
      cx += cols[i];
    });

    // Row border
    doc.setDrawColor(235, 235, 235);
    doc.line(MARGIN, y + rowH, MARGIN + CONTENT_W, y + rowH);
    y += rowH;
  });

  drawFooter(doc, pageNum, pageNum);
  doc.save(`${horse.name.replace(/\s+/g, "_")}_sante.pdf`);
}

// ──────────────────────────────────────────────
// RAPPORT MENSUEL (ENTRAÎNEMENT)
// ──────────────────────────────────────────────
export function generateRapportPdf(
  horse: { name: string; breed?: string | null; discipline?: string | null },
  sessions: Array<{
    id: string;
    date: string;
    type: string;
    duration_min: number;
    intensity: number;
    feeling?: number | null;
    notes?: string | null;
  }>
) {
  const TRAINING_LABELS: Record<string, string> = {
    dressage: "Dressage", saut: "Saut d'obstacles", endurance: "Endurance",
    cso: "CSO", cross: "Cross", travail_a_pied: "Travail à pied",
    longe: "Longe", galop: "Galop", plat: "Plat", autre: "Autre",
  };
  const FEELING_LABELS: Record<number, string> = { 1: "Très mauvais", 2: "Mauvais", 3: "Correct", 4: "Bon", 5: "Excellent" };

  // Filter last 30 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  const monthSessions = sessions.filter((s) => s.date >= cutoffStr);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let pageNum = 1;
  const estimatedPages = Math.ceil((monthSessions.length * 8 + 100) / 260) || 1;

  drawHeader(doc, horse.name, "Rapport mensuel");
  let y = 32;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...BLACK);
  doc.text("Rapport mensuel", MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  const monthLabel = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  doc.text(`${horse.name}  ·  ${monthLabel}`, MARGIN, y + 7);
  y += 18;

  // Stats cards
  const totalSessions = monthSessions.length;
  const totalMin = monthSessions.reduce((s, r) => s + r.duration_min, 0);
  const avgIntensity = totalSessions > 0
    ? (monthSessions.reduce((s, r) => s + r.intensity, 0) / totalSessions).toFixed(1)
    : "—";

  const statW = CONTENT_W / 3 - 2;
  [[totalSessions, "Séances"], [`${Math.floor(totalMin / 60)}h${totalMin % 60 > 0 ? String(totalMin % 60).padStart(2, "0") : ""}`, "Durée totale"], [avgIntensity, "Intensité moy."]].forEach(([val, lbl], i) => {
    const x = MARGIN + i * (statW + 3);
    doc.setFillColor(...LIGHT);
    doc.rect(x, y, statW, 16, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...ORANGE);
    doc.text(String(val), x + statW / 2, y + 10, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(lbl as string, x + statW / 2, y + 15, { align: "center" });
  });
  y += 22;

  // Types breakdown
  if (totalSessions > 0) {
    const byType: Record<string, number> = {};
    monthSessions.forEach((s) => { byType[s.type] = (byType[s.type] || 0) + 1; });
    const types = Object.entries(byType).sort((a, b) => b[1] - a[1]);

    y = sectionTitle(doc, "Répartition par type", y);
    const barMaxW = CONTENT_W - 50;
    const maxCount = types[0]?.[1] ?? 1;
    types.forEach(([type, count]) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...BLACK);
      const label = TRAINING_LABELS[type] || type;
      doc.text(label, MARGIN, y + 4);

      const barW = (count / maxCount) * barMaxW;
      doc.setFillColor(...ORANGE);
      doc.rect(MARGIN + 48, y, barW, 5, "F");
      doc.setFontSize(7);
      doc.setTextColor(...GRAY);
      doc.text(`${count} séance${count > 1 ? "s" : ""}`, MARGIN + 48 + barW + 2, y + 4);
      y += 8;
    });
    y += 4;
  }

  // Sessions table
  if (monthSessions.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GRAY);
    doc.text("Aucune séance ce mois-ci.", MARGIN, y + 10);
    drawFooter(doc, 1, 1);
    doc.save(`${horse.name.replace(/\s+/g, "_")}_rapport.pdf`);
    return;
  }

  y = sectionTitle(doc, "Détail des séances", y);

  const cols = [24, 36, 20, 20, 24, 54];
  const headers = ["Date", "Type", "Durée", "Intensité", "Ressenti", "Notes"];
  doc.setFillColor(...BLACK);
  doc.rect(MARGIN, y, CONTENT_W, 7, "F");
  let cx = MARGIN + 2;
  headers.forEach((h, i) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    doc.text(h, cx, y + 5);
    cx += cols[i];
  });
  y += 7;

  monthSessions.forEach((sess, idx) => {
    if (y > 270) {
      drawFooter(doc, pageNum, estimatedPages);
      doc.addPage();
      pageNum++;
      drawHeader(doc, horse.name, "Rapport mensuel");
      y = 30;
    }

    const rowH = 8;
    doc.setFillColor(idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250);
    doc.rect(MARGIN, y, CONTENT_W, rowH, "F");

    const dateStr = new Date(sess.date + "T00:00:00").toLocaleDateString("fr-FR");
    const typeLabel = TRAINING_LABELS[sess.type] || sess.type;
    const durStr = `${sess.duration_min}min`;
    const intensStr = `${sess.intensity}/5`;
    const feelStr = sess.feeling ? FEELING_LABELS[sess.feeling] || "—" : "—";
    const notes = sess.notes ? (sess.notes.length > 35 ? sess.notes.substring(0, 33) + "…" : sess.notes) : "—";

    cx = MARGIN + 2;
    [dateStr, typeLabel, durStr, intensStr, feelStr, notes].forEach((val, i) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...BLACK);
      doc.text(val, cx, y + 5.5);
      cx += cols[i];
    });

    doc.setDrawColor(235, 235, 235);
    doc.line(MARGIN, y + rowH, MARGIN + CONTENT_W, y + rowH);
    y += rowH;
  });

  drawFooter(doc, pageNum, pageNum);
  doc.save(`${horse.name.replace(/\s+/g, "_")}_rapport.pdf`);
}
