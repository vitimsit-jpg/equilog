"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

const CONDITIONS_OPTIONS = [
  { value: "achat", label: "Achat" },
  { value: "don", label: "Don" },
  { value: "pret", label: "Prêt" },
  { value: "elevage_personnel", label: "Élevage personnel" },
] as const;

interface Props {
  horseId: string;
  horseName: string;
  identite: {
    sire_number: string | null;
    lieu_naissance: string | null;
    conditions_acquisition: string | null;
    historique_avant_acquisition: string | null;
  };
}

export default function HorseIdentiteCard({ horseId, horseName, identite }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [sire, setSire] = useState(identite.sire_number ?? "");
  const [lieu, setLieu] = useState(identite.lieu_naissance ?? "");
  const [conditions, setConditions] = useState<string>(identite.conditions_acquisition ?? "");
  const [historique, setHistorique] = useState(identite.historique_avant_acquisition ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("horses").update({
      sire_number: sire.trim() || null,
      lieu_naissance: lieu.trim() || null,
      conditions_acquisition: conditions || null,
      historique_avant_acquisition: historique.trim() || null,
    }).eq("id", horseId);
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Fiche mise à jour");
      setEditing(false);
      router.refresh();
    }
    setSaving(false);
  };

  const hasData = identite.sire_number || identite.lieu_naissance || identite.conditions_acquisition || identite.historique_avant_acquisition;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-black text-sm">Identité & acquisition</h2>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-black transition-colors">
            <Edit2 className="h-3 w-3" /> Modifier
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="h-4 w-4 text-gray-400" />
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-black text-white text-xs font-semibold">
              <Check className="h-3 w-3" /> {saving ? "…" : "Sauvegarder"}
            </button>
          </div>
        )}
      </div>

      {!editing ? (
        hasData ? (
          <div className="space-y-2">
            {identite.sire_number && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Numéro SIRE</span>
                <span className="text-xs font-semibold text-black font-mono">{identite.sire_number}</span>
              </div>
            )}
            {identite.lieu_naissance && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Lieu de naissance</span>
                <span className="text-xs font-semibold text-black">{identite.lieu_naissance}</span>
              </div>
            )}
            {identite.conditions_acquisition && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Acquisition</span>
                <span className="text-xs font-semibold text-black capitalize">{
                  CONDITIONS_OPTIONS.find(o => o.value === identite.conditions_acquisition)?.label ?? identite.conditions_acquisition
                }</span>
              </div>
            )}
            {identite.historique_avant_acquisition && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Historique avant acquisition</p>
                <p className="text-xs text-gray-700 leading-relaxed">{identite.historique_avant_acquisition}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400">Aucune information renseignée. Cliquez sur Modifier pour compléter.</p>
        )
      ) : (
        <div className="space-y-4">
          <div>
            <label className="label mb-1">Numéro SIRE</label>
            <input
              type="text"
              value={sire}
              onChange={(e) => setSire(e.target.value)}
              placeholder="Ex : 12345678901234"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black"
            />
          </div>
          <div>
            <label className="label mb-1">Lieu de naissance</label>
            <input
              type="text"
              value={lieu}
              onChange={(e) => setLieu(e.target.value)}
              placeholder="Ex : Haras du Pin, Normandie"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black"
            />
          </div>
          <div>
            <label className="label mb-2">Conditions d&apos;acquisition</label>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setConditions(conditions === opt.value ? "" : opt.value)}
                  className={`px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                    conditions === opt.value ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label mb-1">Historique avant acquisition <span className="font-normal text-gray-400">(optionnel)</span></label>
            <textarea
              value={historique}
              onChange={(e) => setHistorique(e.target.value)}
              placeholder={`Contexte d'avant l'acquisition de ${horseName}…`}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-black resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
