"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function RecalculateButton({ horseId }: { horseId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRecalculate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/horse-index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horseId }),
      });
      if (!res.ok) throw new Error("Erreur de calcul");
      toast.success("Score recalculé !");
      router.refresh();
    } catch {
      toast.error("Impossible de recalculer");
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleRecalculate}
      disabled={loading}
      className="btn-secondary text-xs py-1.5 px-3"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
      Recalculer
    </button>
  );
}
