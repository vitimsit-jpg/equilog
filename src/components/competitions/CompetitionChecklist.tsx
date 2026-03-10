"use client";

import { } from "react";
import type { Competition, HealthRecord, Horse } from "@/lib/supabase/types";
import { CheckCircle, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";

interface Props {
  competition: Competition;
  healthRecords: HealthRecord[];
  horse: Horse;
  onClose: () => void;
}

interface ChecklistItem {
  ok: boolean;
  item: string;
  status: string;
}

// Generate checklist client-side (without AI for speed; AI version via API)
function generateLocalChecklist(healthRecords: HealthRecord[], competition: Competition): ChecklistItem[] {
  const checks: ChecklistItem[] = [];

  const compDate = new Date(competition.date);
  const today = new Date();
  const daysToComp = Math.ceil((compDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Vaccin
  const vaccines = healthRecords
    .filter((r) => r.type === "vaccin")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (vaccines.length === 0) {
    checks.push({ ok: false, item: "Vaccin grippe", status: "Aucun vaccin enregistré" });
  } else {
    const lastVaccin = vaccines[0];
    const daysSinceVaccin = Math.floor((compDate.getTime() - new Date(lastVaccin.date).getTime()) / (1000 * 60 * 60 * 24));
    const feiMinDays = 21; // FEI: au moins 21 jours avant, au plus 6 mois (183j)
    const feiMaxDays = 183;

    if (daysSinceVaccin < feiMinDays) {
      checks.push({ ok: false, item: "Vaccin grippe FEI", status: `Trop récent (${daysSinceVaccin}j) — FEI requiert min. 21 jours` });
    } else if (daysSinceVaccin > feiMaxDays) {
      checks.push({ ok: false, item: "Vaccin grippe FEI", status: `Périmé (${daysSinceVaccin}j) — FEI requiert max. 6 mois` });
    } else {
      checks.push({ ok: true, item: "Vaccin grippe FEI", status: `Valide — ${formatDate(lastVaccin.date)} (${daysSinceVaccin}j)` });
    }
  }

  // Vermifuge
  const vermifuges = healthRecords
    .filter((r) => r.type === "vermifuge")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (vermifuges.length === 0) {
    checks.push({ ok: false, item: "Vermifuge", status: "Aucun vermifuge enregistré" });
  } else {
    const lastV = vermifuges[0];
    const daysSince = Math.floor((today.getTime() - new Date(lastV.date).getTime()) / (1000 * 60 * 60 * 24));
    checks.push({
      ok: daysSince <= 90,
      item: "Vermifuge",
      status: daysSince <= 90 ? `À jour — ${formatDate(lastV.date)}` : `En retard — dernier il y a ${daysSince} jours`,
    });
  }

  // Parage
  const ferrages = healthRecords
    .filter((r) => r.type === "ferrage")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (ferrages.length === 0) {
    checks.push({ ok: false, item: "Parage", status: "Aucun parage enregistré" });
  } else {
    const lastF = ferrages[0];
    const daysSince = Math.floor((today.getTime() - new Date(lastF.date).getTime()) / (1000 * 60 * 60 * 24));
    checks.push({
      ok: daysSince <= 35,
      item: "Parage",
      status: daysSince <= 35 ? `À jour — ${formatDate(lastF.date)}` : `En retard — il y a ${daysSince} jours`,
    });
  }

  // Dentiste
  const dentistes = healthRecords
    .filter((r) => r.type === "dentiste")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (dentistes.length > 0) {
    const last = dentistes[0];
    const daysSince = Math.floor((today.getTime() - new Date(last.date).getTime()) / (1000 * 60 * 60 * 24));
    checks.push({
      ok: daysSince <= 365,
      item: "Dentiste",
      status: daysSince <= 365 ? `À jour — ${formatDate(last.date)}` : `À planifier — il y a ${daysSince} jours`,
    });
  }

  // Generic checklist items
  checks.push({ ok: true, item: "Matériel de concours", status: "À vérifier 2 jours avant" });
  checks.push({ ok: true, item: "Documents (carte d'identité, licence)", status: "À préparer" });
  checks.push({ ok: true, item: "Transport / van", status: "À réserver si nécessaire" });

  if (daysToComp >= 0 && daysToComp <= 7) {
    checks.push({ ok: true, item: "Bain et préparation", status: `J-${daysToComp}` });
  }

  return checks;
}

export default function CompetitionChecklist({ competition, healthRecords, onClose }: Omit<Props, "horse"> & { horse?: Horse }) {
  const checklist = generateLocalChecklist(healthRecords, competition);

  const okCount = checklist.filter((c) => c.ok).length;
  const total = checklist.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500">{formatDate(competition.date)}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-semibold text-black">{okCount}/{total} checks</span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full w-24">
              <div
                className="h-full rounded-full bg-success transition-all"
                style={{ width: `${(okCount / total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {checklist.map((item, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 p-3 rounded-lg ${
              item.ok ? "bg-green-50" : "bg-red-50"
            }`}
          >
            {item.ok ? (
              <CheckCircle className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-4 w-4 text-danger flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-semibold text-black">{item.item}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.status}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
        <Button variant="secondary" onClick={onClose}>Fermer</Button>
      </div>
    </div>
  );
}
