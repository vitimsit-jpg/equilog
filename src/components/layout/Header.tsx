"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, User, Bell } from "lucide-react";
import { useState } from "react";
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
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-black transition-colors relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-orange" />
        </button>

        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">
              {user?.name?.[0]?.toUpperCase() || <User className="h-3.5 w-3.5" />}
            </div>
            <span className="text-sm font-medium text-black">{user?.name || "Mon compte"}</span>
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-black truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-black transition-colors"
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
