"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, X } from "lucide-react";

interface Props {
  mediaUrls: string[];
}

function isVideo(url: string) {
  return /\.(mp4|mov|avi|webm|mkv)(\?|$)/i.test(url);
}

export default function FeedMediaPreview({ mediaUrls }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (!mediaUrls || mediaUrls.length === 0) return null;

  const visible = mediaUrls.slice(0, 4);
  const extra = mediaUrls.length - 4;

  const gridClass =
    visible.length === 1
      ? "grid-cols-1"
      : visible.length === 2
      ? "grid-cols-2"
      : "grid-cols-2";

  return (
    <>
      <div className={`grid ${gridClass} gap-1 mt-2 rounded-xl overflow-hidden`}>
        {visible.map((url, i) => {
          const isLast = i === 3 && extra > 0;
          return (
            <div
              key={i}
              className={`relative cursor-pointer bg-gray-100 overflow-hidden ${
                visible.length === 3 && i === 2 ? "col-span-2" : ""
              }`}
              style={{ aspectRatio: visible.length === 1 ? "16/9" : "1" }}
              onClick={() => setLightbox(url)}
            >
              {isVideo(url) ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-900 relative">
                  <video src={url} className="absolute inset-0 w-full h-full object-cover opacity-50" muted />
                  <Play className="h-8 w-8 text-white relative z-10" />
                </div>
              ) : (
                <Image src={url} alt="" fill className="object-cover" unoptimized />
              )}
              {isLast && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-black text-lg">+{extra}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5" />
          </button>
          {isVideo(lightbox) ? (
            <video
              src={lightbox}
              controls
              autoPlay
              className="max-w-full max-h-full rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={lightbox}
              alt=""
              className="max-w-full max-h-[90vh] rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </>
  );
}
