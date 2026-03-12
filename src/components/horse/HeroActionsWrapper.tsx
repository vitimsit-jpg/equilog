"use client";

import { useState } from "react";
import { MoreHorizontal, X } from "lucide-react";
import { haptic } from "@/lib/haptic";

export default function HeroActionsWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop: all buttons inline */}
      <div className="hidden md:flex items-center gap-1.5">{children}</div>

      {/* Mobile: single "···" pill */}
      <div className="md:hidden">
        <button
          onClick={() => { haptic("light"); setOpen(true); }}
          className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white active:scale-95 transition-transform"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Mobile bottom sheet */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-white rounded-t-3xl animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <p className="text-base font-bold text-black">Actions</p>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {/* Actions */}
            <div
              className="flex flex-col gap-2 p-5 pb-10"
              onClick={() => setOpen(false)}
            >
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
