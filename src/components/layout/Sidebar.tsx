"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Heart,
  Dumbbell,
  Trophy,
  Wallet,
  Settings,
  ChevronDown,
  Plus,
  Star,
  Medal,
  Users,
  Building2,
  Video,
  ShoppingBag,
} from "lucide-react";
import type { Horse, UserType } from "@/lib/supabase/types";
import { useState } from "react";
import HorseAvatar from "@/components/ui/HorseAvatar";

interface SidebarProps {
  horses: Horse[];
  currentHorseId?: string;
  userType?: UserType | null;
  overdueByHorse?: Record<string, number>;
}

const mainNav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/communaute", icon: Users, label: "Communauté" },
  { href: "/classements", icon: Medal, label: "Classements" },
  { href: "/marketplace", icon: ShoppingBag, label: "Marketplace" },
];

const horseNavItems = [
  { href: "health", icon: Heart, label: "Carnet de santé" },
  { href: "training", icon: Dumbbell, label: "Journal de travail" },
  { href: "competitions", icon: Trophy, label: "Concours" },
  { href: "budget", icon: Wallet, label: "Budget" },
  { href: "video", icon: Video, label: "Analyse Vidéo" },
];

// Profile-specific nav ordering and visibility
const HORSE_NAV_BY_PROFILE: Record<string, string[]> = {
  loisir:          ["health", "training", "video", "budget", "competitions"],
  competition:     ["health", "competitions", "training", "video", "budget"],
  pro:             ["health", "training", "video", "competitions", "budget"],
  gerant_cavalier: ["health", "training", "video", "competitions", "budget"],
  coach:           ["health", "training", "video", "competitions", "budget"],
  gerant_ecurie:   ["health", "budget", "training", "competitions"],
};

// Items hidden (secondary) for certain profiles
const HIDDEN_ITEMS: Record<string, string[]> = {
  gerant_ecurie: ["competitions"],
  coach: [],
};

export default function Sidebar({ horses, currentHorseId, userType, overdueByHorse = {} }: SidebarProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string | null>(currentHorseId || null);

  const profileKey = userType || "loisir";
  const navOrder = HORSE_NAV_BY_PROFILE[profileKey] || HORSE_NAV_BY_PROFILE.loisir;
  const hiddenItems = HIDDEN_ITEMS[profileKey] || [];

  const orderedHorseNav = navOrder
    .map((href) => horseNavItems.find((item) => item.href === href)!)
    .filter((item) => item && !hiddenItems.includes(item.href));

  const darkNavItem = "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 transition-all duration-150 hover:bg-white/10 hover:text-white";
  const darkNavItemActive = "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-orange";

  return (
    <aside className="w-64 min-h-screen bg-[#0F0F0F] flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange flex items-center justify-center shadow-orange">
            <span className="text-white font-black text-sm">E</span>
          </div>
          <span className="font-black text-white text-lg tracking-tight">EQUISTRA</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {/* Main nav */}
        {mainNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(active ? darkNavItemActive : darkNavItem)}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}

        {/* Mon Écurie — gérants uniquement */}
        {(userType === "gerant_ecurie" || userType === "gerant_cavalier") && (
          <Link
            href="/mon-ecurie"
            className={cn(pathname === "/mon-ecurie" ? darkNavItemActive : darkNavItem)}
          >
            <Building2 className="h-4 w-4 flex-shrink-0" />
            Mon Écurie
          </Link>
        )}

        {/* Horses section */}
        <div className="pt-5">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-2xs font-bold uppercase tracking-widest text-gray-600">Mes chevaux</span>
            <Link
              href="/horses/new"
              className="p-0.5 rounded hover:bg-white/10 text-gray-600 hover:text-white transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </Link>
          </div>

          {horses.length === 0 && (
            <Link href="/horses/new" className={darkNavItem}>
              <Plus className="h-4 w-4" />
              Ajouter un cheval
            </Link>
          )}

          {horses.map((horse) => {
            const isExpanded = expanded === horse.id;
            const isActiveHorse = pathname.includes(horse.id);

            return (
              <div key={horse.id}>
                <button
                  onClick={() => setExpanded(isExpanded ? null : horse.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                    isActiveHorse
                      ? "text-white bg-white/10"
                      : "text-gray-400 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <HorseAvatar name={horse.name} photoUrl={horse.avatar_url} size="xs" rounded="full" />
                    <span className="truncate">{horse.name}</span>
                  </div>
                  {overdueByHorse[horse.id] > 0 && (
                    <span className="ml-1 flex-shrink-0 w-4 h-4 rounded-full bg-danger text-white text-xs flex items-center justify-center font-bold">
                      {overdueByHorse[horse.id]}
                    </span>
                  )}
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-gray-600 transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>

                {isExpanded && (() => {
                  const healthItem = orderedHorseNav.find((i) => i.href === "health");
                  const restItems = orderedHorseNav.filter((i) => i.href !== "health");
                  const renderNavItem = (item: (typeof orderedHorseNav)[number]) => {
                    const href = `/horses/${horse.id}/${item.href}`;
                    const active = pathname === href;
                    const showAlert = item.href === "health" && overdueByHorse[horse.id] > 0;
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={cn(
                          active ? darkNavItemActive : darkNavItem,
                          "text-xs py-2"
                        )}
                      >
                        <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {showAlert && (
                          <span className="w-4 h-4 rounded-full bg-danger text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                            {overdueByHorse[horse.id]}
                          </span>
                        )}
                      </Link>
                    );
                  };
                  return (
                    <div className="ml-3 pl-3 border-l border-white/10 mt-1 space-y-0.5">
                      {healthItem && renderNavItem(healthItem)}
                      <Link
                        href={`/horses/${horse.id}`}
                        className={cn(
                          pathname === `/horses/${horse.id}` ? darkNavItemActive : darkNavItem,
                          "text-xs py-2"
                        )}
                      >
                        <Star className="h-3.5 w-3.5" />
                        Horse Index
                      </Link>
                      {restItems.map(renderNavItem)}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 border-t border-white/10 pt-3">
        <Link href="/settings" className={cn(pathname === "/settings" ? darkNavItemActive : darkNavItem)}>
          <Settings className="h-4 w-4" />
          Paramètres
        </Link>
      </div>
    </aside>
  );
}
