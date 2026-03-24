"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import type { HorseNutrition, NutritionFibre, NutritionHerbe, NutritionGranule, NutritionComplement, NutritionRepas } from "@/lib/supabase/types";

// ── Small helpers ──────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2);
}

function BtnGroup<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-xl border text-sm font-semibold transition-all ${
            value === o.value
              ? "border-orange bg-orange-light text-orange"
              : "border-gray-200 text-gray-500 hover:border-gray-400"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Defaults ───────────────────────────────────────────────────────────────────

const defaultFibre = (): NutritionFibre => ({ id: uid(), type: "foin", mode: "fixe", quantite_kg: 6 });
const defaultGranule = (): NutritionGranule => ({
  id: uid(), nom: "", type: "standard",
  repas: [{ horaire: "matin", quantite_l: 2 }, { horaire: "soir", quantite_l: 1.5 }],
});
const defaultComplement = (): NutritionComplement => ({
  id: uid(), nom: "", forme: "poudre", quantite: null, unite: "g",
  frequence: "quotidien", cure_semaines: null, cure_debut: null,
});

// ── Sub-components ─────────────────────────────────────────────────────────────

function FibreBlock({ fibre, onChange, onDelete }: {
  fibre: NutritionFibre;
  onChange: (updated: NutritionFibre) => void;
  onDelete: () => void;
}) {
  return (
    <div className="border border-gray-100 rounded-2xl p-4 space-y-3 bg-gray-50/50">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Type</p>
        <button type="button" onClick={onDelete} className="text-gray-300 hover:text-red-400 transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <BtnGroup
        options={[
          { value: "foin", label: "Foin" },
          { value: "luzerne", label: "Luzerne" },
          { value: "melange", label: "Mélange foin-luzerne" },
        ]}
        value={fibre.type}
        onChange={(v) => onChange({ ...fibre, type: v })}
      />
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Mode</p>
      <BtnGroup
        options={[
          { value: "fixe", label: "Ration fixe" },
          { value: "volonte", label: "À volonté" },
        ]}
        value={fibre.mode}
        onChange={(v) => onChange({ ...fibre, mode: v, quantite_kg: v === "volonte" ? null : (fibre.quantite_kg ?? 6) })}
      />
      {fibre.mode === "fixe" && (
        <>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Quantité</p>
          <BtnGroup
            options={[
              { value: "2" as any, label: "2 kg" },
              { value: "4" as any, label: "4 kg" },
              { value: "6" as any, label: "6 kg" },
              { value: "8" as any, label: "8 kg" },
              { value: "10" as any, label: "10 kg" },
            ]}
            value={fibre.quantite_kg !== null && [2,4,6,8,10].includes(fibre.quantite_kg) ? String(fibre.quantite_kg) as any : null}
            onChange={(v) => onChange({ ...fibre, quantite_kg: Number(v) })}
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0.5}
              max={25}
              step={0.5}
              value={fibre.quantite_kg ?? ""}
              onChange={(e) => onChange({ ...fibre, quantite_kg: Number(e.target.value) || null })}
              placeholder="Personnalisé (kg)"
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange"
            />
            <span className="text-sm text-gray-400">kg</span>
          </div>
        </>
      )}
    </div>
  );
}

function GranuleBlock({ granule, onChange, onDelete }: {
  granule: NutritionGranule;
  onChange: (updated: NutritionGranule) => void;
  onDelete: () => void;
}) {
  const HORAIRES: NutritionRepas["horaire"][] = ["matin", "midi", "apresmidi", "soir"];
  const HORAIRE_LABELS: Record<NutritionRepas["horaire"], string> = {
    matin: "Matin", midi: "Midi", apresmidi: "Après-midi", soir: "Soir",
  };

  const setNbRepas = (nb: number) => {
    const defaultHoraires: NutritionRepas["horaire"][] = nb === 2 ? ["matin", "soir"] : ["matin", "midi", "soir"];
    const repas: NutritionRepas[] = Array.from({ length: nb }, (_, i) => ({
      horaire: defaultHoraires[i] ?? HORAIRES[i],
      quantite_l: granule.repas[i]?.quantite_l ?? 1.5,
    }));
    onChange({ ...granule, repas });
  };

  const updateRepas = (idx: number, partial: Partial<NutritionRepas>) => {
    const repas = granule.repas.map((r, i) => i === idx ? { ...r, ...partial } : r);
    onChange({ ...granule, repas });
  };

  const QTY_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3];

  return (
    <div className="border border-gray-100 rounded-2xl p-4 space-y-3 bg-gray-50/50">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Produit</p>
        <button type="button" onClick={onDelete} className="text-gray-300 hover:text-red-400 transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <input
        type="text"
        value={granule.nom}
        onChange={(e) => onChange({ ...granule, nom: e.target.value })}
        placeholder="Nom du produit (ex: Pavo Condition Mix)"
        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange"
      />
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Type</p>
      <BtnGroup
        options={[
          { value: "standard", label: "Granulés" },
          { value: "floconnes", label: "Floconnés" },
          { value: "extrudes", label: "Extrudés" },
          { value: "mash", label: "Mash" },
          { value: "autre", label: "Autre" },
        ]}
        value={granule.type}
        onChange={(v) => onChange({ ...granule, type: v })}
      />
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Repas par jour</p>
      <BtnGroup
        options={[
          { value: "2" as any, label: "2 repas" },
          { value: "3" as any, label: "3 repas" },
        ]}
        value={String(granule.repas.length) as any}
        onChange={(v) => setNbRepas(Number(v))}
      />
      <div className="flex items-center gap-2">
        <input
          type="number" min={1} max={5} step={1}
          placeholder="Personnalisé (1–5)"
          value={![2,3].includes(granule.repas.length) ? granule.repas.length : ""}
          onChange={(e) => { const n = Math.min(5, Math.max(1, Number(e.target.value))); if (n) setNbRepas(n); }}
          className="w-36 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange"
        />
        <span className="text-xs text-gray-400">repas par jour</span>
      </div>

      {/* Per-repas detail */}
      <div className="space-y-2 pt-1">
        {granule.repas.map((repas, idx) => (
          <div key={idx} className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 w-12">{`Repas ${idx + 1}`}</span>
            <div className="flex flex-wrap gap-1.5">
              {HORAIRES.map((h) => (
                <button
                  key={h} type="button"
                  onClick={() => updateRepas(idx, { horaire: h })}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                    repas.horaire === h ? "border-orange bg-orange-light text-orange" : "border-gray-200 text-gray-400 hover:border-gray-300"
                  }`}
                >
                  {HORAIRE_LABELS[h]}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 ml-auto">
              {QTY_OPTIONS.map((q) => (
                <button
                  key={q} type="button"
                  onClick={() => updateRepas(idx, { quantite_l: q })}
                  className={`px-2 py-1 rounded-lg border text-xs font-semibold transition-all ${
                    repas.quantite_l === q ? "border-orange bg-orange-light text-orange" : "border-gray-200 text-gray-400 hover:border-gray-300"
                  }`}
                >
                  {q}L
                </button>
              ))}
              <input
                type="number" min={0.1} max={10} step={0.1}
                value={!QTY_OPTIONS.includes(repas.quantite_l) ? repas.quantite_l : ""}
                onChange={(e) => updateRepas(idx, { quantite_l: Number(e.target.value) || repas.quantite_l })}
                placeholder="Autre"
                className="w-16 px-2 py-1 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-orange"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComplementBlock({ complement, onChange, onDelete }: {
  complement: NutritionComplement;
  onChange: (updated: NutritionComplement) => void;
  onDelete: () => void;
}) {
  return (
    <div className="border border-gray-100 rounded-2xl p-4 space-y-3 bg-gray-50/50">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Complément</p>
        <button type="button" onClick={onDelete} className="text-gray-300 hover:text-red-400 transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <input
        type="text"
        value={complement.nom}
        onChange={(e) => onChange({ ...complement, nom: e.target.value })}
        placeholder="Nom (ex: Cortaflex, Biotine)"
        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange"
      />
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Forme</p>
      <BtnGroup
        options={[
          { value: "poudre", label: "Poudre" },
          { value: "liquide", label: "Liquide" },
          { value: "granules", label: "Granulés" },
          { value: "seringue", label: "Seringue" },
          { value: "autre", label: "Autre" },
        ]}
        value={complement.forme}
        onChange={(v) => onChange({ ...complement, forme: v })}
      />
      <div className="flex items-center gap-2">
        <input
          type="number" min={0} step={0.5}
          value={complement.quantite ?? ""}
          onChange={(e) => onChange({ ...complement, quantite: Number(e.target.value) || null })}
          placeholder="Quantité"
          className="w-28 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange"
        />
        <BtnGroup
          options={[
            { value: "ml", label: "ml" },
            { value: "g", label: "g" },
            { value: "dose", label: "dose" },
            { value: "mesure", label: "mesure" },
          ]}
          value={complement.unite}
          onChange={(v) => onChange({ ...complement, unite: v })}
        />
      </div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Fréquence</p>
      <BtnGroup
        options={[
          { value: "quotidien", label: "Quotidien" },
          { value: "matin_soir", label: "Matin + Soir" },
          { value: "hebdomadaire", label: "Hebdomadaire" },
          { value: "cure", label: "En cure" },
        ]}
        value={complement.frequence}
        onChange={(v) => onChange({ ...complement, frequence: v, cure_semaines: v === "cure" ? (complement.cure_semaines ?? 4) : null })}
      />
      {complement.frequence === "cure" && (
        <>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Durée de la cure</p>
          <BtnGroup
            options={[
              { value: "2" as any, label: "2 semaines" },
              { value: "4" as any, label: "4 semaines" },
              { value: "6" as any, label: "6 semaines" },
            ]}
            value={complement.cure_semaines !== null && [2,4,6].includes(complement.cure_semaines) ? String(complement.cure_semaines) as any : null}
            onChange={(v) => onChange({ ...complement, cure_semaines: Number(v) })}
          />
          <div className="flex items-center gap-2">
            <input
              type="number" min={1} max={52}
              placeholder="Personnalisé (semaines)"
              value={complement.cure_semaines !== null && ![2,4,6].includes(complement.cure_semaines) ? complement.cure_semaines : ""}
              onChange={(e) => onChange({ ...complement, cure_semaines: Number(e.target.value) || null })}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange"
            />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Date de début de la cure</p>
            <input
              type="date"
              value={complement.cure_debut ?? ""}
              onChange={(e) => onChange({ ...complement, cure_debut: e.target.value || null })}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange"
            />
          </div>
        </>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  horseId: string;
  existingNutrition: HorseNutrition | null;
  onCancel?: () => void;
}

export default function NutritionSetup({ horseId, existingNutrition, onCancel }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [fibres, setFibres] = useState<NutritionFibre[]>(
    existingNutrition?.fibres ?? [defaultFibre()]
  );
  const [herbe, setHerbe] = useState<NutritionHerbe>(
    existingNutrition?.herbe ?? { actif: false, heures: null }
  );
  const [granules, setGranules] = useState<NutritionGranule[]>(
    existingNutrition?.granules ?? []
  );
  const [complements, setComplements] = useState<NutritionComplement[]>(
    existingNutrition?.complements ?? []
  );
  const [reason, setReason] = useState("");

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          horseId,
          ration: { fibres, herbe, granules, complements },
          reason: reason.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Ration enregistrée");
      router.refresh();
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Section Fibres ── */}
      <section className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌾</span>
            <h3 className="text-sm font-bold text-black">Fibres</h3>
          </div>
          <button
            type="button"
            onClick={() => setFibres([...fibres, defaultFibre()])}
            className="flex items-center gap-1.5 text-xs font-semibold text-orange hover:text-orange/80 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </button>
        </div>
        {fibres.length === 0 && (
          <p className="text-xs text-gray-400 italic">Aucune fibre ajoutée</p>
        )}
        {fibres.map((f, idx) => (
          <FibreBlock
            key={f.id}
            fibre={f}
            onChange={(updated) => setFibres(fibres.map((x, i) => i === idx ? updated : x))}
            onDelete={() => setFibres(fibres.filter((_, i) => i !== idx))}
          />
        ))}
      </section>

      {/* ── Section Herbe / Pâture ── */}
      <section className="card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌿</span>
          <h3 className="text-sm font-bold text-black">Herbe / Pâture</h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setHerbe({ actif: true, heures: herbe.heures })}
            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
              herbe.actif ? "border-orange bg-orange-light text-orange" : "border-gray-200 text-gray-500"
            }`}
          >
            Accès pâture
          </button>
          <button
            type="button"
            onClick={() => setHerbe({ actif: false, heures: null })}
            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
              !herbe.actif ? "border-orange bg-orange-light text-orange" : "border-gray-200 text-gray-500"
            }`}
          >
            Pas de pâture
          </button>
        </div>
        {herbe.actif && (
          <>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Durée estimée par jour</p>
            <BtnGroup
              options={[
                { value: "2", label: "2h" },
                { value: "4", label: "4h" },
                { value: "6", label: "6h" },
                { value: "journee", label: "Toute la journée" },
              ]}
              value={herbe.heures}
              onChange={(v) => setHerbe({ ...herbe, heures: v })}
            />
          </>
        )}
      </section>

      {/* ── Section Granulés ── */}
      <section className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🥣</span>
            <h3 className="text-sm font-bold text-black">Granulés / Aliments composés</h3>
          </div>
          <button
            type="button"
            onClick={() => setGranules([...granules, defaultGranule()])}
            className="flex items-center gap-1.5 text-xs font-semibold text-orange hover:text-orange/80 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </button>
        </div>
        {granules.length === 0 && (
          <p className="text-xs text-gray-400 italic">Aucun granulé ajouté</p>
        )}
        {granules.map((g, idx) => (
          <GranuleBlock
            key={g.id}
            granule={g}
            onChange={(updated) => setGranules(granules.map((x, i) => i === idx ? updated : x))}
            onDelete={() => setGranules(granules.filter((_, i) => i !== idx))}
          />
        ))}
      </section>

      {/* ── Section Compléments ── */}
      <section className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">💊</span>
            <h3 className="text-sm font-bold text-black">Compléments</h3>
          </div>
          <button
            type="button"
            onClick={() => setComplements([...complements, defaultComplement()])}
            className="flex items-center gap-1.5 text-xs font-semibold text-orange hover:text-orange/80 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </button>
        </div>
        {complements.length === 0 && (
          <p className="text-xs text-gray-400 italic">Aucun complément ajouté</p>
        )}
        {complements.map((c, idx) => (
          <ComplementBlock
            key={c.id}
            complement={c}
            onChange={(updated) => setComplements(complements.map((x, i) => i === idx ? updated : x))}
            onDelete={() => setComplements(complements.filter((_, i) => i !== idx))}
          />
        ))}
      </section>

      {/* ── Reason (only on edit) ── */}
      {existingNutrition && (
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
            Raison de la modification <span className="font-normal normal-case">(optionnelle)</span>
          </p>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="ex: Reprise après période de repos"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange"
          />
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex gap-3 pb-6">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:border-gray-300 transition-colors"
          >
            Annuler
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 btn-primary py-3 text-sm font-bold disabled:opacity-60"
        >
          {saving ? "Enregistrement…" : "Enregistrer la ration"}
        </button>
      </div>
    </div>
  );
}
