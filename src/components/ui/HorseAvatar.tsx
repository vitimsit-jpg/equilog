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

const SIZE_PX = { xs: 24, sm: 32, md: 36, lg: 40 };
const SIZE_CLASSES = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-9 h-9 text-sm",
  lg: "w-10 h-10 text-base",
};

export default function HorseAvatar({ name, photoUrl, size = "md", className = "", rounded = "xl" }: Props) {
  const [error, setError] = useState(false);
  const sizeClass = SIZE_CLASSES[size];
  const px = SIZE_PX[size];
  const roundedClass = rounded === "full" ? "rounded-full" : rounded === "xl" ? "rounded-xl" : "rounded-lg";

  if (photoUrl && !error) {
    return (
      <div className={`relative ${sizeClass} ${roundedClass} overflow-hidden flex-shrink-0 ${className}`}>
        <Image
          src={photoUrl}
          alt={name}
          width={px}
          height={px}
          className="object-cover w-full h-full"
          unoptimized
          onError={() => setError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} ${roundedClass} bg-black text-white font-black flex items-center justify-center flex-shrink-0 ${className}`}
    >
      {name[0].toUpperCase()}
    </div>
  );
}
