// Client-side only — do not import from server components
import jsPDF from "jspdf";

const PAGE_W = 210;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;

function drawHeader(doc: jsPDF, horseName: string, docType: string) {
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, PAGE_W, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("EQUISTRA", MARGIN, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text(`${horseName}  ·  ${docType}`, MARGIN + 32, 14);
  const dateStr = new Date().toLocaleDateString("fr-FR");
  doc.text(dateStr, PAGE_W - MARGIN, 14, { align: "right" });
}

function drawFooter(doc: jsPDF, pageNum: number, total: number) {
  const y = 290;
  doc.setDrawColor(243, 244, 246);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text("Généré par Equistra", MARGIN, y + 5);
  doc.text(`Page ${pageNum} / ${total}`, PAGE_W - MARGIN, y + 5, { align: "right" });
}

function sectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFillColor(243, 244, 246);
  doc.rect(MARGIN, y, CONTENT_W, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(title.toUpperCase(), MARGIN + 3, y + 5);
  return y + 11;
}

function labelValue(doc: jsPDF, label: string, value: string, x: number, y: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text(label, x, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(value || "—", x, y + 5);
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
    sire_number?: string | null;
    fei_number?: string | null;
  },
  score: { score: number; score_breakdown?: Record<string, number> | null; computed_at: string } | null
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawHeader(doc, horse.name, "Fiche cheval");

  let y = 32;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(0, 0, 0);
  doc.text(horse.name, MARGIN, y);
  y += 8;

  if (horse.discipline || horse.breed) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text([horse.breed, horse.discipline].filter(Boolean).join(" · "), MARGIN, y);
    y += 8;
  }
  y += 4;

  y = sectionTitle(doc, "Profil", y);
  const colW = CONTENT_W / 3;
  const row1y = y;

  labelValue(doc, "Race", horse.breed || "—", MARGIN, y);
  labelValue(doc, "Discipline", horse.discipline || "—", MARGIN + colW, y);
  labelValue(doc, "Année de naissance", horse.birth_year?.toString() || "—", MARGIN + colW * 2, y);
  y = row1y + 14;

  labelValue(doc, "Écurie", horse.ecurie || "—", MARGIN, y);
  labelValue(doc, "Région", horse.region || "—", MARGIN + colW, y);
  if (horse.sire_number || horse.fei_number) {
    labelValue(doc, "N° SIRE", horse.sire_number || "—", MARGIN + colW * 2, y);
    y += 14;
    if (horse.fei_number) {
      labelValue(doc, "N° FEI", horse.fei_number, MARGIN, y);
    }
    y += 16;
  } else {
    y += 16;
  }

  if (score) {
    y = sectionTitle(doc, "Horse Index", y);

    doc.setFillColor(0, 0, 0);
    doc.roundedRect(MARGIN, y, 36, 28, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(255, 255, 255);
    doc.text(score.score.toString(), MARGIN + 18, y + 17, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("HORSE INDEX", MARGIN + 18, y + 23, { align: "center" });

    const label = score.score >= 85 ? "Excellent" : score.score >= 70 ? "Très bon" : score.score >= 55 ? "Bon" : score.score >= 40 ? "Moyen" : "À améliorer";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(`Calculé le ${new Date(score.computed_at).toLocaleDateString("fr-FR")}`, MARGIN + 42, y + 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    if (score.score >= 70) {
      doc.setTextColor(22, 163, 74);
    } else if (score.score >= 40) {
      doc.setTextColor(217, 119, 6);
    } else {
      doc.setTextColor(220, 38, 38);
    }
    doc.text(label, MARGIN + 42, y + 18);
    y += 34;

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
        doc.setTextColor(107, 114, 128);
        doc.text("Détail par dimension :", MARGIN, y);
        y += 5;

        const barW = CONTENT_W / keys.length - 4;
        const maxBarH = 20;
        keys.forEach((key, i) => {
          const val = Math.round(breakdown[key]);
          const x = MARGIN + i * (barW + 4);
          const barH = Math.max(1, (val / 100) * maxBarH);

          doc.setFillColor(243, 244, 246);
          doc.rect(x, y, barW, maxBarH, "F");

          doc.setFillColor(232, 68, 10);
          doc.rect(x, y + maxBarH - barH, barW, barH, "F");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(0, 0, 0);
          doc.text(val.toString(), x + barW / 2, y + maxBarH - barH - 2, { align: "center" });

          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.5);
          doc.setTextColor(107, 114, 128);
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
    osteo: "Ostéopathie", ferrage: "Parage", autre: "Autre",
  };

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let pageNum = 1;
  const estimatedPages = Math.ceil((records.length * 8 + 80) / 260) || 1;

  drawHeader(doc, horse.name, "Carnet de santé");
  let y = 32;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text("Carnet de santé", MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(horse.name, MARGIN, y + 7);
  y += 18;

  const today = new Date().toISOString().split("T")[0];
  const overdue = records.filter((r) => r.next_date && r.next_date < today).length;
  const upcoming = records.filter((r) => r.next_date && r.next_date >= today).length;
  const statW3 = CONTENT_W / 3 - 2;

  [[records.length, "Soins total", false], [overdue, "En retard", overdue > 0], [upcoming, "À venir", false]].forEach(([val, lbl, isAlert], i) => {
    const x = MARGIN + i * (statW3 + 3);
    doc.setFillColor(243, 244, 246);
    doc.rect(x, y, statW3, 14, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    if (isAlert) {
      doc.setTextColor(220, 38, 38);
    } else {
      doc.setTextColor(0, 0, 0);
    }
    doc.text(String(val), x + statW3 / 2, y + 8, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text(lbl as string, x + statW3 / 2, y + 13, { align: "center" });
  });
  y += 20;

  if (records.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text("Aucun soin enregistré.", MARGIN, y + 10);
    drawFooter(doc, 1, 1);
    doc.save(`${horse.name.replace(/\s+/g, "_")}_sante.pdf`);
    return;
  }

  y = sectionTitle(doc, "Historique des soins", y);

  const cols = [28, 36, 36, 32, 46];
  const headers = ["Date", "Type", "Prochain RDV", "Vétérinaire", "Notes"];
  doc.setFillColor(0, 0, 0);
  doc.rect(MARGIN, y, CONTENT_W, 7, "F");
  let cx = MARGIN + 2;
  headers.forEach((h, i) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
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
    const rowBg = idx % 2 === 0 ? 255 : 250;
    doc.setFillColor(rowBg, rowBg, rowBg);
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
        doc.setTextColor(0, 0, 0);
      }
      doc.text(val, cx, y + 5.5);
      cx += cols[i];
    });

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
  doc.setTextColor(0, 0, 0);
  doc.text("Rapport mensuel", MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  const monthLabel = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  doc.text(`${horse.name}  ·  ${monthLabel}`, MARGIN, y + 7);
  y += 18;

  const totalSessions = monthSessions.length;
  const totalMin = monthSessions.reduce((s, r) => s + r.duration_min, 0);
  const avgIntensity = totalSessions > 0
    ? (monthSessions.reduce((s, r) => s + r.intensity, 0) / totalSessions).toFixed(1)
    : "—";
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  const durationStr = `${hours}h${mins > 0 ? String(mins).padStart(2, "0") : ""}`;

  const statW = CONTENT_W / 3 - 2;
  ([
    [String(totalSessions), "Séances"],
    [durationStr, "Durée totale"],
    [String(avgIntensity), "Intensité moy."],
  ] as [string, string][]).forEach(([val, lbl], i) => {
    const x = MARGIN + i * (statW + 3);
    doc.setFillColor(243, 244, 246);
    doc.rect(x, y, statW, 16, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(232, 68, 10);
    doc.text(val, x + statW / 2, y + 10, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(107, 114, 128);
    doc.text(lbl, x + statW / 2, y + 15, { align: "center" });
  });
  y += 22;

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
      doc.setTextColor(0, 0, 0);
      const label = TRAINING_LABELS[type] || type;
      doc.text(label, MARGIN, y + 4);
      const barW = (count / maxCount) * barMaxW;
      doc.setFillColor(232, 68, 10);
      doc.rect(MARGIN + 48, y, barW, 5, "F");
      doc.setFontSize(7);
      doc.setTextColor(107, 114, 128);
      doc.text(`${count} séance${count > 1 ? "s" : ""}`, MARGIN + 48 + barW + 2, y + 4);
      y += 8;
    });
    y += 4;
  }

  if (monthSessions.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text("Aucune séance ce mois-ci.", MARGIN, y + 10);
    drawFooter(doc, 1, 1);
    doc.save(`${horse.name.replace(/\s+/g, "_")}_rapport.pdf`);
    return;
  }

  y = sectionTitle(doc, "Détail des séances", y);

  const cols = [24, 36, 20, 20, 24, 54];
  const headers = ["Date", "Type", "Durée", "Intensité", "Ressenti", "Notes"];
  doc.setFillColor(0, 0, 0);
  doc.rect(MARGIN, y, CONTENT_W, 7, "F");
  let cx = MARGIN + 2;
  headers.forEach((h, i) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
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
    const rowBg = idx % 2 === 0 ? 255 : 250;
    doc.setFillColor(rowBg, rowBg, rowBg);
    doc.rect(MARGIN, y, CONTENT_W, rowH, "F");

    const dateStr = new Date(sess.date + "T00:00:00").toLocaleDateString("fr-FR");
    const typeLabel = TRAINING_LABELS[sess.type] || sess.type;
    const durStr = `${sess.duration_min}min`;
    const intensStr = `${sess.intensity}/5`;
    const feelStr = sess.feeling ? (FEELING_LABELS[sess.feeling] || "—") : "—";
    const notes = sess.notes ? (sess.notes.length > 35 ? sess.notes.substring(0, 33) + "…" : sess.notes) : "—";

    cx = MARGIN + 2;
    [dateStr, typeLabel, durStr, intensStr, feelStr, notes].forEach((val, i) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
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

// ──────────────────────────────────────────────
// BILAN ANNUEL
// ──────────────────────────────────────────────
export function generateBilanAnnuelPdf(
  horse: { name: string; breed?: string | null; discipline?: string | null },
  sessions: Array<{ id: string; date: string; type: string; duration_min: number; intensity: number; feeling?: number | null }>,
  healthRecords: Array<{ id: string; type: string; date: string; cost?: number | null }>,
  competitions: Array<{ id: string; date: string; event_name: string; discipline: string; result_rank?: number | null; total_riders?: number | null }>,
  budgetEntries?: Array<{ id: string; date: string; category: string; amount: number; description?: string | null }>
) {
  const TRAINING_LABELS: Record<string, string> = {
    dressage: "Dressage", saut: "Saut", endurance: "Endurance",
    cso: "CSO", cross: "Cross", travail_a_pied: "Pied",
    longe: "Longe", galop: "Galop", plat: "Plat", autre: "Autre",
  };
  const HEALTH_LABELS: Record<string, string> = {
    vaccin: "Vaccin", vermifuge: "Vermifuge", dentiste: "Dentiste",
    osteo: "Ostéo", ferrage: "Parage", autre: "Autre",
  };
  const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];

  const year = new Date().getFullYear();
  const cutoff = `${year}-01-01`;

  const yearSessions = sessions.filter((s) => s.date >= cutoff);
  const yearHealth = healthRecords.filter((r) => r.date >= cutoff);
  const yearCompetitions = competitions.filter((c) => c.date >= cutoff);
  const yearBudget = (budgetEntries || []).filter((b) => b.date >= cutoff);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawHeader(doc, horse.name, `Bilan ${year}`);
  let y = 32;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text(`Bilan ${year}`, MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(`${horse.name}${horse.discipline ? "  ·  " + horse.discipline : ""}`, MARGIN, y + 7);
  y += 18;

  // Stats globales
  const totalMin = yearSessions.reduce((s, r) => s + r.duration_min, 0);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  const avgIntensity = yearSessions.length > 0
    ? (yearSessions.reduce((s, r) => s + r.intensity, 0) / yearSessions.length).toFixed(1)
    : "—";
  const totalBudget = yearBudget.reduce((s, b) => s + b.amount, 0);
  const totalHealthCost = yearHealth.reduce((s, r) => s + (r.cost || 0), 0);
  const displayBudget = totalBudget > 0 ? totalBudget : totalHealthCost;

  const stats: [string, string][] = [
    [String(yearSessions.length), "Séances"],
    [`${hours}h${mins > 0 ? String(mins).padStart(2, "0") : ""}`, "Travail total"],
    [String(yearCompetitions.length), "Concours"],
    [displayBudget > 0 ? `${Math.round(displayBudget)}€` : String(yearHealth.length), displayBudget > 0 ? "Dépenses" : "Soins"],
  ];
  const statW = (CONTENT_W - 6) / 4;
  stats.forEach(([val, lbl], i) => {
    const x = MARGIN + i * (statW + 2);
    doc.setFillColor(243, 244, 246);
    doc.rect(x, y, statW, 16, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(232, 68, 10);
    doc.text(val, x + statW / 2, y + 9, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(107, 114, 128);
    doc.text(lbl, x + statW / 2, y + 14.5, { align: "center" });
  });
  y += 22;

  // Activité par mois
  if (yearSessions.length > 0) {
    y = sectionTitle(doc, "Activité mensuelle", y);
    const byMonth: number[] = new Array(12).fill(0);
    yearSessions.forEach((s) => {
      const m = parseInt(s.date.split("-")[1]) - 1;
      if (m >= 0 && m < 12) byMonth[m]++;
    });
    const maxM = Math.max(...byMonth, 1);
    const colW = CONTENT_W / 12;
    const maxBarH = 18;

    byMonth.forEach((count, m) => {
      const x = MARGIN + m * colW;
      if (count > 0) {
        const barH = (count / maxM) * maxBarH;
        doc.setFillColor(232, 68, 10);
        doc.rect(x + 1, y + maxBarH - barH, colW - 2, barH, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);
        doc.setTextColor(0, 0, 0);
        doc.text(String(count), x + colW / 2, y + maxBarH - barH - 1, { align: "center" });
      } else {
        doc.setFillColor(243, 244, 246);
        doc.rect(x + 1, y + maxBarH - 1, colW - 2, 1, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      doc.setTextColor(107, 114, 128);
      doc.text(MONTH_LABELS[m], x + colW / 2, y + maxBarH + 4, { align: "center" });
    });
    y += maxBarH + 10;
  }

  // Répartition par type
  if (yearSessions.length > 0) {
    y = sectionTitle(doc, `Répartition des séances  ·  intensité moy. ${avgIntensity}/5`, y);
    const byType: Record<string, number> = {};
    yearSessions.forEach((s) => { byType[s.type] = (byType[s.type] || 0) + 1; });
    const typeEntries = Object.entries(byType).sort((a, b) => b[1] - a[1]);
    const maxCount = typeEntries[0]?.[1] ?? 1;
    const half = Math.ceil(typeEntries.length / 2);
    const colHalf = (CONTENT_W - 8) / 2;

    typeEntries.forEach(([type, count], i) => {
      const col = i < half ? 0 : 1;
      const row = i < half ? i : i - half;
      const x = MARGIN + col * (colHalf + 8);
      const rowY = y + row * 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text(TRAINING_LABELS[type] || type, x, rowY + 4);
      const barW = (count / maxCount) * (colHalf - 32);
      doc.setFillColor(232, 68, 10);
      doc.rect(x + 28, rowY, barW, 4, "F");
      doc.setFontSize(6.5);
      doc.setTextColor(107, 114, 128);
      doc.text(`${count}`, x + 28 + barW + 2, rowY + 4);
    });
    y += Math.ceil(typeEntries.length / 2) * 7 + 4;
  }

  // Palmarès
  if (yearCompetitions.length > 0) {
    y = sectionTitle(doc, "Palmarès", y);
    const cols = [26, 60, 30, 62];
    const headers = ["Date", "Concours", "Discipline", "Résultat"];
    doc.setFillColor(0, 0, 0);
    doc.rect(MARGIN, y, CONTENT_W, 7, "F");
    let cx = MARGIN + 2;
    headers.forEach((h, i) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(h, cx, y + 5);
      cx += cols[i];
    });
    y += 7;

    yearCompetitions.forEach((comp, idx) => {
      if (y > 272) {
        drawFooter(doc, 1, 1);
        doc.addPage();
        drawHeader(doc, horse.name, `Bilan ${year}`);
        y = 30;
      }
      const rowH = 7;
      doc.setFillColor(idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 250);
      doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
      const dateStr = new Date(comp.date + "T00:00:00").toLocaleDateString("fr-FR");
      const rankStr = comp.result_rank && comp.total_riders
        ? `${comp.result_rank}e / ${comp.total_riders}`
        : comp.result_rank ? `${comp.result_rank}e` : "—";
      const eventName = comp.event_name.length > 28 ? comp.event_name.substring(0, 26) + "…" : comp.event_name;
      cx = MARGIN + 2;
      [dateStr, eventName, comp.discipline, rankStr].forEach((val, i) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);
        doc.text(val, cx, y + 5);
        cx += cols[i];
      });
      doc.setDrawColor(235, 235, 235);
      doc.line(MARGIN, y + rowH, MARGIN + CONTENT_W, y + rowH);
      y += rowH;
    });
    y += 4;
  }

  // Soins
  if (yearHealth.length > 0) {
    if (y > 260) {
      drawFooter(doc, 1, 1);
      doc.addPage();
      drawHeader(doc, horse.name, `Bilan ${year}`);
      y = 30;
    }
    y = sectionTitle(doc, "Soins de l'année", y);
    const byType: Record<string, number> = {};
    yearHealth.forEach((r) => { byType[r.type] = (byType[r.type] || 0) + 1; });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    const parts = Object.entries(byType).map(([t, n]) => `${HEALTH_LABELS[t] || t} ×${n}`).join("  ·  ");
    doc.text(parts, MARGIN, y + 5);
    y += 14;
  }

  // Budget
  if (yearBudget.length > 0) {
    const BUDGET_LABELS: Record<string, string> = {
      alimentation: "Alimentation", sante: "Santé", ferrure: "Ferrure",
      equipement: "Équipement", transport: "Transport", concours: "Concours",
      ecurie: "Écurie", autre: "Autre",
    };
    if (y > 250) {
      drawFooter(doc, 1, 1);
      doc.addPage();
      drawHeader(doc, horse.name, `Bilan ${year}`);
      y = 30;
    }
    y = sectionTitle(doc, `Budget de l'année  ·  Total ${Math.round(totalBudget)}€`, y);

    // By category bar chart
    const byCategory: Record<string, number> = {};
    yearBudget.forEach((b) => { byCategory[b.category] = (byCategory[b.category] || 0) + b.amount; });
    const catEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    const maxCat = catEntries[0]?.[1] ?? 1;
    const barMaxW = CONTENT_W - 52;

    catEntries.forEach(([cat, amount]) => {
      if (y > 272) return;
      const label = BUDGET_LABELS[cat] || cat;
      const barW = (amount / maxCat) * barMaxW;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text(label, MARGIN, y + 4);
      doc.setFillColor(232, 68, 10);
      doc.rect(MARGIN + 46, y, barW, 5, "F");
      doc.setFontSize(7);
      doc.setTextColor(107, 114, 128);
      doc.text(`${Math.round(amount)}€`, MARGIN + 46 + barW + 2, y + 4);
      y += 8;
    });
    y += 4;
  }

  drawFooter(doc, 1, 1);
  doc.save(`${horse.name.replace(/\s+/g, "_")}_bilan_${year}.pdf`);
}
