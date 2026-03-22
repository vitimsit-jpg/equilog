"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, User, Globe, Plus, X, Dumbbell, Heart,
} from "lucide-react";
import type { Horse } from "@/lib/supabase/types";
import HorseAvatar from "@/components/ui/HorseAvatar";
import { cn } from "@/lib/utils";
import QuickTrainingModal from "@/components/training/QuickTrainingModal";
import QuickHealthModal from "@/components/health/QuickHealthModal";

interface Props {
  horses: Horse[];
  overdueByHorse?: Record<string, number>;
}

type ActionType = "training" | "health";

export default function MobileBottomNav({ horses, overdueByHorse = {} }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [fabOpen, setFabOpen] = useState(false);
  const [horsePicker, setHorsePicker] = useState<ActionType | null>(null);
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null);
  const [action, setAction] = useState<ActionType | null>(null);

  const hasAnyOverdue = Object.values(overdueByHorse).some((v) => v > 0);

  const leftItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Accueil" },
    { href: "/chevaux", icon: null, emoji: "🐴", label: "Chevaux", badge: hasAnyOverdue },
  ];
  const rightItems = [
    { href: "/communaute", icon: Globe, label: "Communauté" },
    { href: "/profil", icon: User, label: "Profil" },
  ];

  const handleAction = (type: ActionType) => {
    setFabOpen(false);
    if (horses.length === 0) return;
    if (horses.length === 1) {
      setSelectedHorse(horses[0]);
      setAction(type);
    } else {
      setHorsePicker(type);
    }
  };

  const handlePickHorse = (horse: Horse) => {
    const type = horsePicker!;
    setSelectedHorse(horse);
    setHorsePicker(null);
    setAction(type);
  };

  const handleClose = () => {
    setAction(null);
    setSelectedHorse(null);
  };

  return (
    <>
      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-100 md:hidden">
        {/* Central FAB — positionné en absolute pour ne pas bloquer les items voisins */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-7 z-50">
          <button
            onClick={() => setFabOpen(true)}
            className="w-14 h-14 rounded-full bg-orange shadow-orange flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus className="h-7 w-7 text-white" />
          </button>
        </div>

        <div
          className="flex items-center justify-around px-1"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          {/* Left 2 items */}
          {leftItems.map((item) => {
            const active = pathname === item.href || (item.href === "/chevaux" && pathname.startsWith("/horses"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 pt-1.5 pb-1 px-3 min-w-[56px] relative"
              >
                <div className={cn("flex items-center justify-center w-9 h-7 rounded-xl transition-all duration-200", active ? "bg-orange-light" : "")}>
                  {item.emoji ? (
                    <span className="text-base leading-none">{item.emoji}</span>
                  ) : (
                    item.icon && <item.icon className={cn("h-5 w-5 transition-colors", active ? "text-orange" : "text-gray-400")} />
                  )}
                </div>
                {item.badge && (
                  <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-danger border-2 border-white" />
                )}
                <span className={cn("text-2xs font-medium transition-colors", active ? "text-orange font-semibold" : "text-gray-400")}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Espace central pour le FAB */}
          <div className="min-w-[56px] pt-1.5 pb-1" />

          {/* Right 2 items */}
          {rightItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 pt-1.5 pb-1 px-3 min-w-[56px]"
              >
                <div className={cn("flex items-center justify-center w-9 h-7 rounded-xl transition-all duration-200", active ? "bg-orange-light" : "")}>
                  <item.icon className={cn("h-5 w-5 transition-colors", active ? "text-orange" : "text-gray-400")} />
                </div>
                <span className={cn("text-2xs font-medium transition-colors", active ? "text-orange font-semibold" : "text-gray-400")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* FAB bottom sheet */}
      {fabOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-fade-in">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setFabOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl animate-slide-up" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="flex items-center justify-between px-5 pt-2 pb-4">
              <span className="font-bold text-black text-base">Ajouter</span>
              <button onClick={() => setFabOpen(false)} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <div className="px-4 pb-2 space-y-3">
              <button
                onClick={() => handleAction("training")}
                disabled={horses.length === 0}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-orange-light border-2 border-orange/20 hover:border-orange transition-all text-left disabled:opacity-40"
              >
                <div className="w-12 h-12 rounded-xl bg-orange flex items-center justify-center flex-shrink-0">
                  <Dumbbell className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-black text-sm">Logger une séance</p>
                  <p className="text-xs text-gray-500 mt-0.5">Enregistrer un entraînement</p>
                </div>
              </button>
              <button
                onClick={() => handleAction("health")}
                disabled={horses.length === 0}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border-2 border-gray-100 hover:border-gray-300 transition-all text-left disabled:opacity-40"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <Heart className="h-6 w-6 text-gray-500" />
                </div>
                <div>
                  <p className="font-bold text-black text-sm">Logger un soin</p>
                  <p className="text-xs text-gray-500 mt-0.5">Vaccin, vétérinaire, ferrage…</p>
                </div>
              </button>
              {horses.length === 0 && (
                <Link
                  href="/horses/new"
                  onClick={() => setFabOpen(false)}
                  className="block text-center text-xs text-orange font-semibold py-2"
                >
                  + Ajouter un cheval d&apos;abord
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Horse picker */}
      {horsePicker && (
        <div className="fixed inset-0 z-50 md:hidden animate-fade-in">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setHorsePicker(null)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl animate-slide-up" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="flex items-center justify-between px-5 pt-2 pb-3">
              <span className="font-bold text-black text-base">Pour quel cheval ?</span>
              <button onClick={() => setHorsePicker(null)} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <div className="px-4 pb-4 space-y-2">
              {horses.map((horse) => (
                <button
                  key={horse.id}
                  onClick={() => handlePickHorse(horse)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-gray-100 bg-gray-50 hover:border-orange hover:bg-orange-light transition-all text-left"
                >
                  <HorseAvatar name={horse.name} photoUrl={horse.avatar_url} size="sm" rounded="full" />
                  <span className="font-semibold text-black text-sm">{horse.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Training modal */}
      {action === "training" && selectedHorse && (
        <QuickTrainingModal
          open={true}
          onClose={handleClose}
          horseId={selectedHorse.id}
          horseName={selectedHorse.name}
          horseMode={(selectedHorse as any).horse_index_mode}
          onSaved={() => { handleClose(); router.refresh(); }}
        />
      )}

      {/* Health modal */}
      {action === "health" && selectedHorse && (
        <QuickHealthModal
          open={true}
          onClose={handleClose}
          horseId={selectedHorse.id}
          onSaved={() => { handleClose(); router.refresh(); }}
        />
      )}
    </>
  );
}
