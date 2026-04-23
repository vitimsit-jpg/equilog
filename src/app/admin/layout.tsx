import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminNav from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Use regular client — user can read their own row via RLS
  const { data: profile } = await supabase
    .from("users")
    .select("is_admin, email")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white flex">
      {/* Sidebar */}
      <aside className="w-56 min-h-screen flex flex-col border-r border-white/10 fixed top-0 left-0 h-full z-10">
        <div className="px-5 py-5 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-orange flex items-center justify-center">
              <span className="text-white font-black text-xs">E</span>
            </div>
            <span className="font-black text-white text-base tracking-tight">EQUISTRA</span>
          </Link>
          <div className="mt-2 text-2xs text-orange font-bold uppercase tracking-widest">Admin</div>
        </div>
        <AdminNav />
        <div className="mt-auto px-4 pb-4 border-t border-white/10 pt-3">
          <p className="text-2xs text-gray-500 truncate">{profile?.email}</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 ml-56">
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
