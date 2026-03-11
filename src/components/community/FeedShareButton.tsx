"use client";

import { useState, useRef, useEffect } from "react";
import { Share2, X } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  horseName: string;
  horseId: string;
  shareHorseIndex: boolean;
  itemType: "session" | "competition";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itemData: any;
}

function buildText(horseName: string, itemType: "session" | "competition", itemData: Record<string, unknown>) {
  const TRAINING_LABELS: Record<string, string> = {
    dressage: "Dressage", saut: "Saut", endurance: "Endurance", cso: "CSO",
    cross: "Cross", travail_a_pied: "Travail à pied", longe: "Longe",
    galop: "Galop", plat: "Plat", autre: "Séance",
  };
  if (itemType === "session") {
    const type = TRAINING_LABELS[itemData.type as string] || "Séance";
    return `🏇 ${horseName} a travaillé en ${type} · ${itemData.duration_min}min — via Equistra`;
  }
  const rank = itemData.result_rank && itemData.total_riders
    ? ` · ${itemData.result_rank}/${itemData.total_riders}`
    : "";
  return `🏆 ${horseName} en concours · ${itemData.event_name}${rank} — via Equistra`;
}

export default function FeedShareButton({ horseName, horseId, shareHorseIndex, itemType, itemData }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const getUrl = () => {
    const base = typeof window !== "undefined" ? window.location.origin : "https://equilog.app";
    return shareHorseIndex ? `${base}/share/${horseId}` : base;
  };

  const shareText = buildText(horseName, itemType, itemData);

  const handleTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(getUrl())}`;
    window.open(url, "_blank", "noopener");
    setOpen(false);
  };

  const handleWhatsapp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${getUrl()}`)}`;
    window.open(url, "_blank", "noopener");
    setOpen(false);
  };

  const handleInstagram = async () => {
    setOpen(false);
    const shareUrl = getUrl();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `Equistra — ${horseName}`, text: shareText, url: shareUrl });
      } catch {
        // user cancelled, do nothing
      }
    } else {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast.success("Lien copié — colle-le dans ton story Instagram !");
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-all"
      >
        <Share2 className="h-3.5 w-3.5" />
        <span>Partager</span>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-100 rounded-xl shadow-lg p-2 flex flex-col gap-1 min-w-[160px] z-20">
          <div className="flex items-center justify-between px-2 pb-1 mb-1 border-b border-gray-50">
            <span className="text-2xs font-bold text-gray-400 uppercase tracking-wide">Partager sur</span>
            <button onClick={() => setOpen(false)} className="text-gray-300 hover:text-gray-500">
              <X className="h-3 w-3" />
            </button>
          </div>

          <button
            onClick={handleTwitter}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span className="text-xs font-medium text-gray-700">X (Twitter)</span>
          </button>

          <button
            onClick={handleWhatsapp}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <svg className="h-4 w-4 flex-shrink-0 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="text-xs font-medium text-gray-700">WhatsApp</span>
          </button>

          <button
            onClick={handleInstagram}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="url(#ig-gradient)">
              <defs>
                <linearGradient id="ig-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f09433"/>
                  <stop offset="25%" stopColor="#e6683c"/>
                  <stop offset="50%" stopColor="#dc2743"/>
                  <stop offset="75%" stopColor="#cc2366"/>
                  <stop offset="100%" stopColor="#bc1888"/>
                </linearGradient>
              </defs>
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
            <span className="text-xs font-medium text-gray-700">Instagram</span>
          </button>
        </div>
      )}
    </div>
  );
}
