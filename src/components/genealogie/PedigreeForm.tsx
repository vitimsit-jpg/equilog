"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { HorsePedigree } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface Props {
  horseId: string;
  pedigree: HorsePedigree | null;
  onSaved?: () => void;
}

type PedigreeFields = Omit<HorsePedigree, "id" | "horse_id" | "created_at" | "updated_at">;

function FieldGroup({ label, nameKey, sireKey, breedKey, values, onChange }: {
  label: string;
  nameKey: keyof PedigreeFields;
  sireKey?: keyof PedigreeFields;
  breedKey?: keyof PedigreeFields;
  values: Partial<PedigreeFields>;
  onChange: (key: keyof PedigreeFields, val: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-2xs font-bold text-gray-500 uppercase tracking-wider">{label}</p>
      <input
        type="text"
        value={(values[nameKey] as string) || ""}
        onChange={(e) => onChange(nameKey, e.target.value)}
        placeholder="Nom"
        className="input"
      />
      {sireKey && (
        <input
          type="text"
          value={(values[sireKey] as string) || ""}
          onChange={(e) => onChange(sireKey, e.target.value)}
          placeholder="Numéro SIRE / Studbook"
          className="input"
        />
      )}
      {breedKey && (
        <input
          type="text"
          value={(values[breedKey] as string) || ""}
          onChange={(e) => onChange(breedKey, e.target.value)}
          placeholder="Race"
          className="input"
        />
      )}
    </div>
  );
}

function NameField({ label, fieldKey, values, onChange }: {
  label: string;
  fieldKey: keyof PedigreeFields;
  values: Partial<PedigreeFields>;
  onChange: (key: keyof PedigreeFields, val: string) => void;
}) {
  return (
    <div>
      <p className="text-2xs text-gray-500 mb-1">{label}</p>
      <input
        type="text"
        value={(values[fieldKey] as string) || ""}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        placeholder="Nom"
        className="input text-xs py-1.5"
      />
    </div>
  );
}

export default function PedigreeForm({ horseId, pedigree, onSaved }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [showGP, setShowGP] = useState(!!pedigree?.gp_pat_pere_name);
  const [showAGP, setShowAGP] = useState(!!pedigree?.agp_pp_pere_name);

  const [fields, setFields] = useState<Partial<PedigreeFields>>({
    pere_name: pedigree?.pere_name || "",
    pere_sire: pedigree?.pere_sire || "",
    pere_breed: pedigree?.pere_breed || "",
    mere_name: pedigree?.mere_name || "",
    mere_sire: pedigree?.mere_sire || "",
    mere_breed: pedigree?.mere_breed || "",
    gp_pat_pere_name: pedigree?.gp_pat_pere_name || "",
    gp_pat_pere_sire: pedigree?.gp_pat_pere_sire || "",
    gp_pat_mere_name: pedigree?.gp_pat_mere_name || "",
    gp_pat_mere_sire: pedigree?.gp_pat_mere_sire || "",
    gp_mat_pere_name: pedigree?.gp_mat_pere_name || "",
    gp_mat_pere_sire: pedigree?.gp_mat_pere_sire || "",
    gp_mat_mere_name: pedigree?.gp_mat_mere_name || "",
    gp_mat_mere_sire: pedigree?.gp_mat_mere_sire || "",
    agp_pp_pere_name: pedigree?.agp_pp_pere_name || "",
    agp_pp_mere_name: pedigree?.agp_pp_mere_name || "",
    agp_pm_pere_name: pedigree?.agp_pm_pere_name || "",
    agp_pm_mere_name: pedigree?.agp_pm_mere_name || "",
    agp_mp_pere_name: pedigree?.agp_mp_pere_name || "",
    agp_mp_mere_name: pedigree?.agp_mp_mere_name || "",
    agp_mm_pere_name: pedigree?.agp_mm_pere_name || "",
    agp_mm_mere_name: pedigree?.agp_mm_mere_name || "",
    notes: pedigree?.notes || "",
  });

  const set = (key: keyof PedigreeFields, val: string) => {
    setFields((prev) => ({ ...prev, [key]: val || null }));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { horse_id: horseId, ...fields };

    let error;
    if (pedigree) {
      ({ error } = await supabase.from("horse_pedigree").update(payload).eq("id", pedigree.id));
    } else {
      ({ error } = await supabase.from("horse_pedigree").insert(payload));
    }

    setSaving(false);
    if (error) {
      toast.error("Erreur lors de l'enregistrement");
    } else {
      toast.success("Généalogie enregistrée");
      onSaved?.();
      router.refresh();
    }
  };

  return (
    <div className="space-y-5">
      {/* Parents */}
      <div className="card space-y-4">
        <h3 className="font-bold text-black text-sm">Parents</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldGroup label="♂ Père" nameKey="pere_name" sireKey="pere_sire" breedKey="pere_breed" values={fields} onChange={set} />
          <FieldGroup label="♀ Mère" nameKey="mere_name" sireKey="mere_sire" breedKey="mere_breed" values={fields} onChange={set} />
        </div>
      </div>

      {/* Grands-parents (toggle) */}
      <div className="card">
        <button
          onClick={() => setShowGP((v) => !v)}
          className="flex items-center justify-between w-full"
        >
          <h3 className="font-bold text-black text-sm">Grands-parents</h3>
          {showGP ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>

        {showGP && (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-2xs font-bold text-gray-400 uppercase tracking-wider mb-2">Côté paternel</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldGroup label="GP pat. ♂" nameKey="gp_pat_pere_name" sireKey="gp_pat_pere_sire" values={fields} onChange={set} />
                <FieldGroup label="GP pat. ♀" nameKey="gp_pat_mere_name" sireKey="gp_pat_mere_sire" values={fields} onChange={set} />
              </div>
            </div>
            <div>
              <p className="text-2xs font-bold text-gray-400 uppercase tracking-wider mb-2">Côté maternel</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldGroup label="GP mat. ♂" nameKey="gp_mat_pere_name" sireKey="gp_mat_pere_sire" values={fields} onChange={set} />
                <FieldGroup label="GP mat. ♀" nameKey="gp_mat_mere_name" sireKey="gp_mat_mere_sire" values={fields} onChange={set} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Arrière-grands-parents (toggle) */}
      <div className="card">
        <button
          onClick={() => setShowAGP((v) => !v)}
          className="flex items-center justify-between w-full"
        >
          <h3 className="font-bold text-black text-sm">Arrière-grands-parents</h3>
          {showAGP ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>

        {showAGP && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <NameField label="AGP PP ♂" fieldKey="agp_pp_pere_name" values={fields} onChange={set} />
            <NameField label="AGP PP ♀" fieldKey="agp_pp_mere_name" values={fields} onChange={set} />
            <NameField label="AGP PM ♂" fieldKey="agp_pm_pere_name" values={fields} onChange={set} />
            <NameField label="AGP PM ♀" fieldKey="agp_pm_mere_name" values={fields} onChange={set} />
            <NameField label="AGP MP ♂" fieldKey="agp_mp_pere_name" values={fields} onChange={set} />
            <NameField label="AGP MP ♀" fieldKey="agp_mp_mere_name" values={fields} onChange={set} />
            <NameField label="AGP MM ♂" fieldKey="agp_mm_pere_name" values={fields} onChange={set} />
            <NameField label="AGP MM ♀" fieldKey="agp_mm_mere_name" values={fields} onChange={set} />
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="label">Notes</label>
        <textarea
          value={(fields.notes as string) || ""}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Informations complémentaires sur la généalogie..."
          className="input mt-1 min-h-[60px] resize-none"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Enregistrer la généalogie
      </button>
    </div>
  );
}
