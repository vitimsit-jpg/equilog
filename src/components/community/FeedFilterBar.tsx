"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  active: string;
}

export default function FeedFilterBar({ active }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navigate = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "ecurie") {
      params.delete("feedFilter");
    } else {
      params.set("feedFilter", key);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex gap-2">
      {[
        { key: "ecurie", label: "Mon écurie" },
        { key: "tout",   label: "Tout" },
        { key: "suivis", label: "Mes suivis" },
      ].map((f) => (
        <button
          key={f.key}
          onClick={() => navigate(f.key)}
          className={cn(
            "text-xs font-semibold px-3 py-1.5 rounded-full border transition-all",
            active === f.key
              ? "bg-black text-white border-black"
              : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
