"use client";

import { useRouter, usePathname } from "next/navigation";
import { useRef } from "react";
import { haptic } from "@/lib/haptic";

const TAB_SUFFIXES = ["", "/health", "/training", "/competitions", "/budget"];

export default function HorseSwipeNav({
  horseId,
  children,
}: {
  horseId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const base = `/horses/${horseId}`;

  const currentSuffix = pathname.startsWith(base)
    ? pathname.slice(base.length)
    : "";
  const currentIndex = TAB_SUFFIXES.findIndex(
    (s) => s === currentSuffix || (s !== "" && currentSuffix.startsWith(s))
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;

    // Require clear horizontal intent — not a scroll
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.6) return;

    // Not on a known tab (e.g. /video) — don't navigate
    if (currentIndex === -1) return;

    if (dx < 0 && currentIndex < TAB_SUFFIXES.length - 1) {
      haptic("light");
      router.push(`${base}${TAB_SUFFIXES[currentIndex + 1]}`);
    } else if (dx > 0 && currentIndex > 0) {
      haptic("light");
      router.push(`${base}${TAB_SUFFIXES[currentIndex - 1]}`);
    }
  };

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {children}
    </div>
  );
}
