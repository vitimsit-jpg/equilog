"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Camera, Film, Plus, X, Loader2, ChevronDown, Play } from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";

interface Props {
  entityType: "training" | "competition";
  entityId: string;
  horseId: string;
  initialMediaUrls: string[];
}

function isVideo(url: string) {
  return /\.(mp4|mov|avi|webm|mkv)(\?|$)/i.test(url);
}

export default function MediaGallery({ entityType, entityId, horseId, initialMediaUrls }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>(initialMediaUrls);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const tableName = entityType === "training" ? "training_sessions" : "competitions";
  const count = mediaUrls.length;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    const supabase = createClient();
    const newUrls: string[] = [];

    for (const file of files) {
      const isVid = file.type.startsWith("video/");
      const maxSize = isVid ? 100 * 1024 * 1024 : 10 * 1024 * 1024;

      if (file.size > maxSize) {
        toast.error(`${file.name} trop lourd (max ${isVid ? "100" : "10"} Mo)`);
        continue;
      }
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        toast.error(`Format non supporté : ${file.name}`);
        continue;
      }

      const ext = file.name.split(".").pop() || "bin";
      const path = `${horseId}/${entityType}/${entityId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from("session-media")
        .upload(path, file, { upsert: false });

      if (error) {
        toast.error(`Erreur upload : ${file.name}`);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage.from("session-media").getPublicUrl(path);
      newUrls.push(publicUrl);
    }

    if (newUrls.length > 0) {
      const updatedUrls = [...mediaUrls, ...newUrls];
      const { error } = await supabase
        .from(tableName)
        .update({ media_urls: updatedUrls })
        .eq("id", entityId);

      if (error) {
        toast.error("Erreur lors de la sauvegarde");
      } else {
        setMediaUrls(updatedUrls);
        toast.success(`${newUrls.length} fichier${newUrls.length > 1 ? "s" : ""} ajouté${newUrls.length > 1 ? "s" : ""}`);
      }
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = async (url: string) => {
    if (!confirm("Supprimer ce média ?")) return;
    const supabase = createClient();
    const updatedUrls = mediaUrls.filter((u) => u !== url);

    const { error } = await supabase
      .from(tableName)
      .update({ media_urls: updatedUrls })
      .eq("id", entityId);

    if (!error) {
      setMediaUrls(updatedUrls);
      toast.success("Média supprimé");
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-orange transition-colors"
      >
        <Camera className="h-3.5 w-3.5" />
        {count > 0 ? `${count} média${count > 1 ? "s" : ""}` : "Médias"}
        <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="mt-3">
          {mediaUrls.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mb-3">
              {mediaUrls.map((url, i) => (
                <div
                  key={i}
                  className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
                  onClick={() => setLightbox(url)}
                >
                  {isVideo(url) ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900 relative">
                      <video src={url} className="absolute inset-0 w-full h-full object-cover opacity-50" muted />
                      <Play className="h-6 w-6 text-white relative z-10" />
                    </div>
                  ) : (
                    <Image src={url} alt="" fill className="object-cover" unoptimized />
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(url); }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {isVideo(url) && (
                    <div className="absolute bottom-1 left-1">
                      <Film className="h-3 w-3 text-white/70" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-black border border-dashed border-gray-200 hover:border-gray-400 rounded-lg px-3 py-2 transition-colors w-full justify-center"
          >
            {uploading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Envoi en cours…</>
            ) : (
              <><Plus className="h-3.5 w-3.5" /> Ajouter photos / vidéos</>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
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
            <div className="relative max-w-4xl max-h-full w-full" style={{ aspectRatio: "auto" }}>
              <img
                src={lightbox}
                alt=""
                className="max-w-full max-h-[90vh] rounded-xl mx-auto object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
