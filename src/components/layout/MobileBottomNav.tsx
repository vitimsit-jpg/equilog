"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, ShoppingBag, Settings,
  Heart, Dumbbell, Trophy, Wallet, Star, Plus, X, Video,
} from "lucide-react";
import type { Horse } from "@/lib/supabase/types";
import HorseAvatar from "@/components/ui/HorseAvatar";
import { cn } from "@/lib/utils";

interface Props {
  horses: Horse[];
  overdueByHorse?: Record<string, number>;
}

const HORSE_SUB_NAV = [
  { href: "health", icon: Heart, label: "Santé" },
  { href: "", icon: Star, label: "Index" },
  { href: "training", icon: Dumbbell, label: "Travail" },
  { href: "competitions", icon: Trophy, label: "Concours" },
  { href: "budget", icon: Wallet, label: "Budget" },
  { href: "video", icon: Video, label: "Vidéo" },
];

export default function MobileBottomNav({ horses, overdueByHorse = {} }: Props) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeHorse = horses.find((h) => pathname.includes(h.id));
  const hasAnyOverdue = Object.values(overdueByHorse).some((v) => v > 0);

  const mainItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/communaute", icon: Users, label: "Communauté" },
    { href: "/marketplace", icon: ShoppingBag, label: "Marché" },
    { href: "/settings", icon: Settings, label: "Réglages" },
  ];

  return (
    <>
      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 md:hidden">
        <div className="flex items-center justify-around px-1 pt-2 pb-3">
          {mainItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 px-2 py-1"
              >
                <item.icon className={cn("h-5 w-5", active ? "text-orange" : "text-gray-400")} />
                <span className={cn("text-2xs font-medium", active ? "text-black" : "text-gray-400")}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Mes chevaux */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center gap-0.5 px-2 py-1 relative"
          >
            {activeHorse ? (
              <HorseAvatar name={activeHorse.name} photoUrl={activeHorse.avatar_url} size="xs" rounded="full" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center">
                <span className="text-white text-xs font-black">+</span>
              </div>
            )}
            {hasAnyOverdue && (
              <span className="absolute top-0.5 right-0 w-2 h-2 rounded-full bg-red-500" />
            )}
            <span className={cn("text-2xs font-medium", activeHorse ? "text-black" : "text-gray-400")}>
              Chevaux
            </span>
          </button>
        </div>
      </nav>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] flex flex-col">
            {/* Handle */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
              <span className="font-bold text-black text-base">Mes chevaux</span>
              <button onClick={() => setDrawerOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {horses.map((horse) => {
                const overdue = overdueByHorse[horse.id] || 0;
                return (
                  <div key={horse.id} className="rounded-xl border border-gray-100 overflow-hidden">
                    {/* Horse name row */}
                    <Link
                      href={`/horses/${horse.id}`}
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 bg-gray-50"
                    >
                      <HorseAvatar name={horse.name} photoUrl={horse.avatar_url} size="sm" rounded="full" />
                      <span className="font-semibold text-black flex-1 truncate">{horse.name}</span>
                      {overdue > 0 && (
                        <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                          {overdue}
                        </span>
                      )}
                    </Link>
                    {/* Sub-nav */}
                    <div className="grid grid-cols-6 divide-x divide-gray-100 border-t border-gray-100">
                      {HORSE_SUB_NAV.map((item) => {
                        const href = item.href ? `/horses/${horse.id}/${item.href}` : `/horses/${horse.id}`;
                        const active = pathname === href;
                        const showDot = item.href === "health" && overdue > 0;
                        return (
                          <Link
                            key={item.href}
                            href={href}
                            onClick={() => setDrawerOpen(false)}
                            className={cn(
                              "relative flex flex-col items-center gap-1 py-3 transition-colors",
                              active ? "bg-orange-light text-orange" : "text-gray-500"
                            )}
                          >
                            <item.icon className="h-4 w-4" />
                            <span className="text-2xs font-medium">{item.label}</span>
                            {showDot && (
                              <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-red-500" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <Link
                href="/horses/new"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-2 justify-center py-3 text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl hover:border-orange hover:text-orange transition-colors"
              >
                <Plus className="h-4 w-4" />
                Ajouter un cheval
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
