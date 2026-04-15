"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import NotificationsBell from "@/components/notifications/NotificationsBell";
import { useState } from "react";
import Link from "next/link";
import type { User as UserType } from "@/lib/supabase/types";

interface HeaderProps {
  user: UserType | null;
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="h-14 bg-white/90 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      {/* Logo visible sur mobile uniquement (sidebar cachée) */}
      <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
        <div className="w-7 h-7 rounded-xl bg-orange flex items-center justify-center shadow-orange">
          <span className="text-white font-black text-xs">E</span>
        </div>
        <span className="font-black text-black text-base tracking-tight">EQUISTRA</span>
      </Link>
      <div className="hidden md:block" />
      <div className="flex items-center gap-1.5">
        <NotificationsBell />

        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">
              {user?.name?.[0]?.toUpperCase() || <User className="h-3.5 w-3.5" />}
            </div>
            <span className="hidden sm:block text-sm font-medium text-black">{user?.name || "Mon compte"}</span>
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl shadow-card-hover border border-gray-100 py-1.5 z-50 animate-scale-in">
              <div className="px-4 py-2.5 border-b border-gray-100">
                <p className="text-xs font-semibold text-black truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
              <Link
                href="/profil"
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-black transition-colors"
              >
                <User className="h-4 w-4" />
                Mon profil
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-danger hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
