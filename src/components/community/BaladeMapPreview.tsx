"use client";

import dynamic from "next/dynamic";

const BaladeMap = dynamic(() => import("@/components/balade/BaladeMap"), { ssr: false });

interface Props {
  coordinates: { lat: number; lng: number }[];
  distanceKm?: number | null;
  durationMin?: number;
  avgSpeed?: number | null;
}

export default function BaladeMapPreview({ coordinates, distanceKm, durationMin, avgSpeed }: Props) {
  if (coordinates.length < 2) return null;

  return (
    <div className="space-y-2">
      <div className="rounded-xl overflow-hidden border border-gray-100" style={{ height: "200px" }}>
        <BaladeMap coordinates={coordinates} interactive={false} height="200px" />
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500">
        {distanceKm != null && (
          <span className="flex items-center gap-1">
            🏇 <span className="font-semibold text-black">{distanceKm} km</span>
          </span>
        )}
        {durationMin != null && durationMin > 0 && (
          <span className="flex items-center gap-1">
            ⏱ <span className="font-semibold text-black">
              {durationMin >= 60 ? `${Math.floor(durationMin / 60)}h${durationMin % 60 > 0 ? `${durationMin % 60}min` : ""}` : `${durationMin}min`}
            </span>
          </span>
        )}
        {avgSpeed != null && avgSpeed > 0 && (
          <span className="flex items-center gap-1">
            ⚡ <span className="font-semibold text-black">{avgSpeed} km/h</span>
          </span>
        )}
      </div>
    </div>
  );
}
