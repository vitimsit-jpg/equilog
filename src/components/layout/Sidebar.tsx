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
} from "lucide-react";
import type { Horse } from "@/lib/supabase/types";
import { useState } from "react";

interface SidebarProps {
  horses: Horse[];
  currentHorseId?: string;
}

const mainNav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
];

const horseNav = [
  { href: "health", icon: Heart, label: "Carnet de santé" },
  { href: "training", icon: Dumbbell, label: "Journal de travail" },
  { href: "competitions", icon: Trophy, label: "Concours" },
  { href: "budget", icon: Wallet, label: "Budget" },
];

export default function Sidebar({ horses, currentHorseId }: SidebarProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string | null>(currentHorseId || null);

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
            <span className="text-white font-black text-sm">E</span>
          </div>
          <span className="font-black text-black text-lg tracking-tight">EQUILOG</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* Main nav */}
        {mainNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(active ? "nav-item-active" : "nav-item")}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}

        {/* Horses section */}
        <div className="pt-4">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="section-title">Mes chevaux</span>
            <Link
              href="/horses/new"
              className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-black transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </Link>
          </div>

          {horses.length === 0 && (
            <Link href="/horses/new" className="nav-item text-gray-400">
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
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActiveHorse
                      ? "bg-orange-light text-black"
                      : "text-gray-600 hover:bg-black/5 hover:text-black"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-black text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                      {horse.name[0].toUpperCase()}
                    </div>
                    <span className="truncate">{horse.name}</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-gray-400 transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>

                {isExpanded && (
                  <div className="ml-3 pl-3 border-l border-gray-100 mt-1 space-y-0.5">
                    <Link
                      href={`/horses/${horse.id}`}
                      className={cn(
                        pathname === `/horses/${horse.id}` ? "nav-item-active" : "nav-item",
                        "text-xs py-2"
                      )}
                    >
                      <Star className="h-3.5 w-3.5" />
                      Horse Index
                    </Link>
                    {horseNav.map((item) => {
                      const href = `/horses/${horse.id}/${item.href}`;
                      const active = pathname === href;
                      return (
                        <Link
                          key={href}
                          href={href}
                          className={cn(
                            active ? "nav-item-active" : "nav-item",
                            "text-xs py-2"
                          )}
                        >
                          <item.icon className="h-3.5 w-3.5" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 border-t border-gray-100 pt-3">
        <Link href="/settings" className={cn(pathname === "/settings" ? "nav-item-active" : "nav-item")}>
          <Settings className="h-4 w-4" />
          Paramètres
        </Link>
      </div>
    </aside>
  );
}
