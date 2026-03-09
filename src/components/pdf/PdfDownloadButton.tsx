"use client";

import { useState } from "react";
import { Download } from "lucide-react";

type PdfType = "fiche" | "sante" | "rapport" | "bilan";

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

interface Competition {
  id: string;
  date: string;
  event_name: string;
  discipline: string;
  result_rank?: number | null;
  total_riders?: number | null;
}

interface Props {
  type: PdfType;
  horse: Horse;
  score?: Score | null;
  records?: HealthRecord[];
  sessions?: TrainingSession[];
  competitions?: Competition[];
}

export default function PdfDownloadButton({ type, horse, score, records, sessions, competitions }: Props) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const { generateFichePdf, generateSantePdf, generateRapportPdf, generateBilanAnnuelPdf } = await import("@/lib/pdf/generatePdf");
      if (type === "fiche") {
        generateFichePdf(horse, score ?? null);
      } else if (type === "sante") {
        generateSantePdf(horse, records ?? []);
      } else if (type === "rapport") {
        generateRapportPdf(horse, sessions ?? []);
      } else if (type === "bilan") {
        generateBilanAnnuelPdf(horse, sessions ?? [], records ?? [], competitions ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  const labels: Record<PdfType, string> = {
    fiche: "Fiche PDF",
    sante: "Exporter PDF",
    rapport: "Rapport PDF",
    bilan: "Bilan annuel",
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
