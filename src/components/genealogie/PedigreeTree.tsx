"use client";

import type { HorsePedigree } from "@/lib/supabase/types";

interface Props {
  horseName: string;
  pedigree: HorsePedigree;
}

interface NodeProps {
  name: string | null | undefined;
  role: string;
  sire?: string | null;
  generation?: number; // 0=cheval, 1=parents, 2=gp, 3=agp
}

function PedigreeNode({ name, role, sire, generation = 1 }: NodeProps) {
  const empty = !name;
  const sizeClass = generation === 1
    ? "min-w-[110px] max-w-[140px]"
    : generation === 2
    ? "min-w-[90px] max-w-[120px]"
    : "min-w-[80px] max-w-[100px]";

  return (
    <div className={`${sizeClass} px-2.5 py-2 rounded-xl border ${empty ? "border-dashed border-gray-200 bg-gray-50" : "border-gray-200 bg-white"} text-center`}>
      <p className={`text-2xs font-bold ${empty ? "text-gray-300" : "text-gray-400"} mb-0.5`}>{role}</p>
      <p className={`text-xs font-bold leading-tight ${empty ? "text-gray-300" : "text-black"}`}>
        {name || "Inconnu"}
      </p>
      {sire && <p className="text-2xs text-gray-400 mt-0.5 truncate">↑ {sire}</p>}
    </div>
  );
}

function ConnectorH({ className = "" }: { className?: string }) {
  return <div className={`h-px bg-gray-200 ${className}`} />;
}

export default function PedigreeTree({ horseName, pedigree: p }: Props) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-stretch gap-0 min-w-max">
        {/* Generation 0: le cheval */}
        <div className="flex items-center">
          <div className="px-3 py-3 rounded-xl border-2 border-black bg-black text-white text-center min-w-[110px]">
            <p className="text-2xs font-bold text-gray-400 mb-0.5">Cheval</p>
            <p className="text-xs font-black leading-tight">{horseName}</p>
          </div>
        </div>

        {/* Connector 0→1 */}
        <div className="flex items-center">
          <ConnectorH className="w-4" />
        </div>

        {/* Generation 1: Père / Mère */}
        <div className="flex flex-col justify-around gap-2">
          <div className="flex items-center gap-0">
            <div className="flex flex-col justify-around gap-2">
              <PedigreeNode name={p.pere_name} role="Père" sire={p.pere_sire} generation={1} />
            </div>
          </div>
          <ConnectorH className="w-0 h-px" />
          <div className="flex items-center gap-0">
            <PedigreeNode name={p.mere_name} role="Mère" sire={p.mere_sire} generation={1} />
          </div>
        </div>

        {/* Connector 1→2 */}
        <div className="flex items-center">
          <ConnectorH className="w-4" />
        </div>

        {/* Generation 2: Grands-parents */}
        <div className="flex flex-col justify-around gap-1">
          <PedigreeNode name={p.gp_pat_pere_name} role="GP pat. ♂" sire={p.gp_pat_pere_sire} generation={2} />
          <PedigreeNode name={p.gp_pat_mere_name} role="GP pat. ♀" sire={p.gp_pat_mere_sire} generation={2} />
          <PedigreeNode name={p.gp_mat_pere_name} role="GP mat. ♂" sire={p.gp_mat_pere_sire} generation={2} />
          <PedigreeNode name={p.gp_mat_mere_name} role="GP mat. ♀" sire={p.gp_mat_mere_sire} generation={2} />
        </div>

        {/* Connector 2→3 */}
        <div className="flex items-center">
          <ConnectorH className="w-4" />
        </div>

        {/* Generation 3: Arrière-grands-parents */}
        <div className="flex flex-col justify-around gap-0.5">
          <PedigreeNode name={p.agp_pp_pere_name} role="AGP ♂" generation={3} />
          <PedigreeNode name={p.agp_pp_mere_name} role="AGP ♀" generation={3} />
          <PedigreeNode name={p.agp_pm_pere_name} role="AGP ♂" generation={3} />
          <PedigreeNode name={p.agp_pm_mere_name} role="AGP ♀" generation={3} />
          <PedigreeNode name={p.agp_mp_pere_name} role="AGP ♂" generation={3} />
          <PedigreeNode name={p.agp_mp_mere_name} role="AGP ♀" generation={3} />
          <PedigreeNode name={p.agp_mm_pere_name} role="AGP ♂" generation={3} />
          <PedigreeNode name={p.agp_mm_mere_name} role="AGP ♀" generation={3} />
        </div>
      </div>
    </div>
  );
}
