"use client";

import { useState } from "react";
import Image from "next/image";

interface Props {
  name: string;
  photoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  rounded?: "full" | "xl" | "lg";
}

const SIZE_CLASSES = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-9 h-9 text-sm",
  lg: "w-10 h-10 text-base",
};

const SIZE_PX = { xs: 24, sm: 32, md: 36, lg: 40 };

export default function HorseAvatar({ name, photoUrl, size = "md", className = "", rounded = "xl" }: Props) {
  const [error, setError] = useState(false);
  const sizeClass = SIZE_CLASSES[size];
  const roundedClass = rounded === "full" ? "rounded-full" : rounded === "xl" ? "rounded-xl" : "rounded-lg";
  const base = `${sizeClass} ${roundedClass} flex-shrink-0 ${className}`;

  if (photoUrl && !error) {
    return (
      <Image
        src={photoUrl}
        alt={name}
        width={SIZE_PX[size]}
        height={SIZE_PX[size]}
        className={`${base} object-cover`}
        onError={() => setError(true)}
        unoptimized={!photoUrl.includes("supabase.co")}
      />
    );
  }

  return (
    <div className={`${base} bg-black text-white font-black flex items-center justify-center`}>
      {name[0].toUpperCase()}
    </div>
  );
}
