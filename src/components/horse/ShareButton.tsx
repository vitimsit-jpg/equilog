"use client";

import { Share2 } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  horseId: string;
  horseName: string;
}

export default function ShareButton({ horseId, horseName }: Props) {
  const handleShare = async () => {
    const url = `${window.location.origin}/share/${horseId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(`Lien du profil de ${horseName} copié !`);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  return (
    <button
      onClick={handleShare}
      className="btn-ghost flex items-center gap-2 text-sm"
      title="Partager le profil public"
    >
      <Share2 className="h-4 w-4" />
      Partager
    </button>
  );
}
