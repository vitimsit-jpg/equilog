"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Camera, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";

interface Props {
  horseId: string;
  horseName: string;
  currentAvatarUrl: string | null;
}

export default function AvatarUpload({ horseId, horseName, currentAvatarUrl }: Props) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fichier trop lourd (max 5 Mo)");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Format non supporté — image requise");
      return;
    }

    setUploading(true);
    const supabase = createClient();

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${horseId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("horse-avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Erreur lors de l'upload");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("horse-avatars")
      .getPublicUrl(path);

    const urlWithBust = `${publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("horses")
      .update({ avatar_url: urlWithBust })
      .eq("id", horseId);

    if (updateError) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      setAvatarUrl(urlWithBust);
      toast.success("Photo mise à jour");
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="relative group">
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative w-16 h-16 rounded-2xl overflow-hidden bg-black text-white flex items-center justify-center hover:opacity-90 transition-opacity"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={horseName}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <span className="font-black text-xl">{horseName[0].toUpperCase()}</span>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading
            ? <Loader2 className="h-5 w-5 text-white animate-spin" />
            : <Camera className="h-5 w-5 text-white" />
          }
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
