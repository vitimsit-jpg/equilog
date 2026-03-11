"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  listingId: string;
  status: string;
}

export default function MarkAsSoldButton({ listingId, status }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const toggle = async () => {
    setLoading(true);
    const newStatus = status === "active" ? "sold" : "active";
    const { error } = await supabase
      .from("listings")
      .update({ status: newStatus })
      .eq("id", listingId);
    if (error) {
      toast.error("Erreur");
    } else {
      toast.success(newStatus === "sold" ? "Annonce marquée comme vendue" : "Annonce réactivée");
      router.refresh();
    }
    setLoading(false);
  };

  const del = async () => {
    if (!confirm("Supprimer définitivement cette annonce ?")) return;
    setLoading(true);
    const { error } = await supabase.from("listings").delete().eq("id", listingId);
    if (error) {
      toast.error("Erreur");
      setLoading(false);
    } else {
      toast.success("Annonce supprimée");
      router.push("/marketplace");
    }
  };

  return (
    <div className="flex gap-3">
      <button onClick={toggle} disabled={loading}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-black text-sm font-semibold hover:bg-black hover:text-white transition-all">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {status === "active" ? "Marquer comme vendu" : "Remettre en ligne"}
      </button>
      <button onClick={del} disabled={loading}
        className="px-4 py-2.5 rounded-xl border-2 border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors">
        Supprimer
      </button>
    </div>
  );
}
