"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";

interface Props {
  horseId: string;
  horseName: string;
}

const TYPE_LABELS: Record<string, string> = {
  vaccin: "Vaccin", vermifuge: "Vermifuge", dentiste: "Dentiste",
  osteo: "Ostéo", ferrage: "Parage/Ferrage", veterinaire: "Vétérinaire",
  masseuse: "Masseuse", autre: "Autre",
  dressage: "Dressage", saut: "Saut", endurance: "Endurance",
  cso: "CSO", cross: "Cross", travail_a_pied: "Travail à pied",
  longe: "Longe", galop: "Galop", plat: "Plat", marcheur: "Marcheur",
};

const BUDGET_LABELS: Record<string, string> = {
  pension: "Pension", soins: "Soins", concours: "Concours",
  equipement: "Équipement", maréchalerie: "Maréchalerie",
  alimentation: "Alimentation", transport: "Transport", autre: "Autre",
};

export default function ExportPDFButton({ horseId, horseName }: Props) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pdf/${horseId}`);
      if (!res.ok) { setLoading(false); return; }
      const { horse, health, training, competitions, budget } = await res.json();

      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });

      const orange = [232, 68, 10] as const;
      const black = [26, 26, 26] as const;
      const gray = [120, 120, 120] as const;
      const lightGray = [245, 245, 245] as const;
      const W = 210;
      const MARGIN = 16;
      let y = 0;

      const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR");
      const addPage = () => { doc.addPage(); y = MARGIN; };
      const checkPage = (needed = 10) => { if (y + needed > 275) addPage(); };

      // ── Cover page ──────────────────────────────────────────────────
      doc.setFillColor(...orange);
      doc.rect(0, 0, W, 60, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.text("Bilan Annuel", MARGIN, 28);
      doc.setFontSize(18);
      doc.setFont("helvetica", "normal");
      doc.text(horse.name, MARGIN, 42);
      doc.setFontSize(10);
      doc.text(
        `Généré le ${new Date().toLocaleDateString("fr-FR")} • Equilog`,
        MARGIN, 54
      );

      y = 72;
      doc.setTextColor(...black);

      // Horse info card
      doc.setFillColor(...lightGray);
      doc.roundedRect(MARGIN, y, W - MARGIN * 2, 38, 3, 3, "F");
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Profil du cheval", MARGIN + 6, y + 9);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const infos = [
        ["Race", horse.breed || "—"],
        ["Naissance", horse.birth_year ? String(horse.birth_year) : "—"],
        ["Discipline", horse.discipline || "—"],
        ["Écurie", horse.ecurie || "—"],
        ["Région", horse.region || "—"],
        ["Sexe", horse.sexe || "—"],
      ];
      infos.forEach(([label, value], i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = MARGIN + 6 + col * 60;
        doc.setTextColor(...gray);
        doc.text(label, x, y + 18 + row * 10);
        doc.setTextColor(...black);
        doc.text(value, x, y + 24 + row * 10);
      });
      y += 46;

      // Stats summary
      const totalTrainingMin = (training || []).reduce((s: number, t: { duration_min: number }) => s + (t.duration_min || 0), 0);
      const totalBudget = (budget || []).reduce((s: number, b: { amount: number }) => s + (b.amount || 0), 0);
      const stats = [
        { label: "Soins", value: String((health || []).length) },
        { label: "Séances", value: String((training || []).length) },
        { label: "Concours", value: String((competitions || []).length) },
        { label: "Heures travail", value: `${Math.round(totalTrainingMin / 60)}h` },
        { label: "Budget total", value: `${totalBudget.toLocaleString("fr-FR")}€` },
      ];
      const cardW = (W - MARGIN * 2 - 8) / stats.length;
      stats.forEach(({ label, value }, i) => {
        const x = MARGIN + i * (cardW + 2);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...orange);
        doc.setLineWidth(0.5);
        doc.roundedRect(x, y, cardW, 22, 2, 2, "FD");
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...orange);
        doc.text(value, x + cardW / 2, y + 11, { align: "center" });
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...gray);
        doc.text(label, x + cardW / 2, y + 17, { align: "center" });
      });
      y += 30;

      // ── Section helper ─────────────────────────────────────────────
      const section = (title: string) => {
        checkPage(14);
        doc.setFillColor(...orange);
        doc.rect(MARGIN, y, W - MARGIN * 2, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(title, MARGIN + 4, y + 5.5);
        doc.setTextColor(...black);
        y += 12;
      };

      const row = (cols: string[], widths: number[], isHeader = false, shade = false) => {
        checkPage(7);
        if (shade) { doc.setFillColor(...lightGray); doc.rect(MARGIN, y - 1, W - MARGIN * 2, 7, "F"); }
        doc.setFont("helvetica", isHeader ? "bold" : "normal");
        doc.setFontSize(isHeader ? 8 : 7.5);
        let x = MARGIN + 2;
        cols.forEach((c, i) => {
          doc.setTextColor(...(isHeader ? orange : black) as [number, number, number]);
          doc.text(String(c).substring(0, 40), x, y + 4);
          x += widths[i];
        });
        y += 7;
      };

      // ── Santé ───────────────────────────────────────────────────────
      if ((health || []).length > 0) {
        section("🏥 Carnet de santé — 12 derniers mois");
        row(["Date", "Type", "Praticien", "Prochain", "Coût"], [28, 36, 50, 36, 20], true);
        (health || []).forEach((h: { date: string; type: string; vet_name: string | null; next_date: string | null; cost: number | null }, idx: number) => {
          row([
            fmt(h.date),
            TYPE_LABELS[h.type] || h.type,
            h.vet_name || "—",
            h.next_date ? fmt(h.next_date) : "—",
            h.cost ? `${h.cost}€` : "—",
          ], [28, 36, 50, 36, 20], false, idx % 2 === 1);
        });
        y += 4;
      }

      // ── Travail ─────────────────────────────────────────────────────
      if ((training || []).length > 0) {
        section("🏇 Journal de travail — 12 derniers mois");
        row(["Date", "Type", "Durée", "Intensité", "Ressenti", "Objectif"], [28, 32, 22, 22, 22, 44], true);
        (training || []).forEach((t: { date: string; type: string; duration_min: number; intensity: number; feeling: number; objectif: string | null }, idx: number) => {
          row([
            fmt(t.date),
            TYPE_LABELS[t.type] || t.type,
            `${t.duration_min}min`,
            "⭐".repeat(t.intensity),
            "⭐".repeat(t.feeling),
            t.objectif || "—",
          ], [28, 32, 22, 22, 22, 44], false, idx % 2 === 1);
        });
        y += 4;
      }

      // ── Concours ────────────────────────────────────────────────────
      if ((competitions || []).length > 0) {
        section("🏆 Concours — 12 derniers mois");
        row(["Date", "Épreuve", "Discipline", "Niveau", "Résultat"], [28, 60, 30, 28, 24], true);
        (competitions || []).forEach((c: { date: string; event_name: string; discipline: string; level: string; result_rank: number | null; total_riders: number | null }, idx: number) => {
          row([
            fmt(c.date),
            c.event_name,
            c.discipline,
            c.level,
            c.result_rank ? `${c.result_rank}${c.total_riders ? `/${c.total_riders}` : ""}` : "—",
          ], [28, 60, 30, 28, 24], false, idx % 2 === 1);
        });
        y += 4;
      }

      // ── Budget ──────────────────────────────────────────────────────
      if ((budget || []).length > 0) {
        section("💰 Budget — 12 derniers mois");
        const byCategory: Record<string, number> = {};
        (budget || []).forEach((b: { category: string; amount: number }) => {
          byCategory[b.category] = (byCategory[b.category] || 0) + b.amount;
        });
        row(["Catégorie", "Montant"], [100, 50], true);
        Object.entries(byCategory)
          .sort(([, a], [, b]) => b - a)
          .forEach(([cat, amount], idx) => {
            row([BUDGET_LABELS[cat] || cat, `${amount.toLocaleString("fr-FR")} €`], [100, 50], false, idx % 2 === 1);
          });
        checkPage(10);
        y += 2;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...orange);
        doc.text(`Total : ${totalBudget.toLocaleString("fr-FR")} €`, MARGIN + 2, y + 4);
        y += 10;
      }

      // ── Footer ──────────────────────────────────────────────────────
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(...gray);
        doc.text(`Equilog — Bilan annuel ${horseName} — Page ${i}/${pageCount}`, W / 2, 290, { align: "center" });
      }

      doc.save(`bilan-annuel-${horseName.toLowerCase().replace(/\s+/g, "-")}-${new Date().getFullYear()}.pdf`);
    } catch (e) {
      console.error("PDF error:", e);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="btn-ghost flex items-center gap-2 text-sm disabled:opacity-50"
    >
      <FileDown className="h-4 w-4" />
      {loading ? "Génération..." : "Export PDF"}
    </button>
  );
}
