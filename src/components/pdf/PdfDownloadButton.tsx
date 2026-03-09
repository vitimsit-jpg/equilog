"use client";

import { useState } from "react";
import { Download } from "lucide-react";

type PdfType = "fiche" | "sante" | "rapport";

interface Horse {
  name: string;
  breed?: string | null;
  discipline?: string | null;
  birth_year?: number | null;
  ecurie?: string | null;
  region?: string | null;
}

interface Score {
  score: number;
  score_breakdown?: Record<string, number> | null;
  computed_at: string;
}

interface HealthRecord {
  id: string;
  type: string;
  date: string;
  next_date?: string | null;
  vet_name?: string | null;
  notes?: string | null;
}

interface TrainingSession {
  id: string;
  date: string;
  type: string;
  duration_min: number;
  intensity: number;
  feeling?: number | null;
  notes?: string | null;
}

interface Props {
  type: PdfType;
  horse: Horse;
  score?: Score | null;
  records?: HealthRecord[];
  sessions?: TrainingSession[];
}

export default function PdfDownloadButton({ type, horse, score, records, sessions }: Props) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const { generateFichePdf, generateSantePdf, generateRapportPdf } = await import("@/lib/pdf/generatePdf");
      if (type === "fiche") {
        generateFichePdf(horse, score ?? null);
      } else if (type === "sante") {
        generateSantePdf(horse, records ?? []);
      } else if (type === "rapport") {
        generateRapportPdf(horse, sessions ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  const labels: Record<PdfType, string> = {
    fiche: "Fiche PDF",
    sante: "Exporter PDF",
    rapport: "Rapport PDF",
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="btn-ghost flex items-center gap-1.5 text-sm"
    >
      <Download className={`h-4 w-4 ${loading ? "animate-bounce" : ""}`} />
      {loading ? "Génération…" : labels[type]}
    </button>
  );
}
