"use client";

import { useState } from "react";
import type { HorsePedigree } from "@/lib/supabase/types";
import PedigreeForm from "@/components/genealogie/PedigreeForm";
import PedigreeTree from "@/components/genealogie/PedigreeTree";
import { findFamousConnections } from "@/lib/famous-horses";

interface Props {
  horseId: string;
  horseName: string;
  pedigree: HorsePedigree | null;
}

export default function GeneaLogieClient({ horseId, horseName, pedigree }: Props) {
  const [tab, setTab] = useState<"arbre" | "saisie">(pedigree ? "arbre" : "saisie");

  // Famous horse connections
  const famousConnections = pedigree
    ? findFamousConnections([
        pedigree.pere_name, pedigree.mere_name,
        pedigree.gp_pat_pere_name, pedigree.gp_pat_mere_name,
        pedigree.gp_mat_pere_name, pedigree.gp_mat_mere_name,
        pedigree.agp_pp_pere_name, pedigree.agp_pp_mere_name,
        pedigree.agp_pm_pere_name, pedigree.agp_pm_mere_name,
        pedigree.agp_mp_pere_name, pedigree.agp_mp_mere_name,
        pedigree.agp_mm_pere_name, pedigree.agp_mm_mere_name,
      ])
    : [];

  const hasSomeData = pedigree && (pedigree.pere_name || pedigree.mere_name);

  return (
    <div className="space-y-4">
      {/* Tab toggle */}
      {hasSomeData && (
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setTab("arbre")}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${tab === "arbre" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Arbre généalogique
          </button>
          <button
            onClick={() => setTab("saisie")}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${tab === "saisie" ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Modifier
          </button>
        </div>
      )}

      {/* Empty state */}
      {!hasSomeData && tab === "arbre" && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-3">🌳</div>
          <p className="text-sm font-semibold text-gray-400">Généalogie non renseignée</p>
          <p className="text-xs text-gray-300 mt-1">Renseignez les ancêtres de votre cheval pour afficher l&apos;arbre généalogique.</p>
          <button onClick={() => setTab("saisie")} className="mt-4 btn-primary px-4 py-2 text-sm">
            Renseigner la généalogie
          </button>
        </div>
      )}

      {/* Pedigree tree */}
      {tab === "arbre" && hasSomeData && pedigree && (
        <div className="space-y-4">
          {/* Famous connections */}
          {famousConnections.length > 0 && (
            <div className="card bg-orange-light border-orange/10">
              <p className="text-xs font-bold text-orange mb-2">Connexions avec des chevaux célèbres</p>
              <div className="space-y-1.5">
                {famousConnections.map((fh) => (
                  <div key={fh.name} className="flex items-start gap-2">
                    <span className="text-base leading-none flex-shrink-0">{fh.emoji}</span>
                    <div>
                      <span className="text-xs font-bold text-black">{fh.name}</span>
                      <span className="text-2xs text-gray-500 ml-1.5">({fh.breed})</span>
                      <p className="text-2xs text-gray-500">{fh.known_for}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h3 className="font-bold text-black text-sm mb-4">Arbre généalogique — {horseName}</h3>
            <PedigreeTree horseName={horseName} pedigree={pedigree} />
          </div>

          {pedigree.notes && (
            <div className="card">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Notes</h3>
              <p className="text-sm text-gray-700">{pedigree.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Pedigree form */}
      {tab === "saisie" && (
        <PedigreeForm
          horseId={horseId}
          pedigree={pedigree}
          onSaved={() => setTab("arbre")}
        />
      )}
    </div>
  );
}
