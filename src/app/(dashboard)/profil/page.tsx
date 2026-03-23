import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SettingsForm from "@/components/settings/SettingsForm";
import GestionEleves from "@/components/settings/GestionEleves";
import RiderProfileBlock from "@/components/rider/RiderProfileBlock";
import type { CoachStudent } from "@/lib/supabase/types";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default async function ProfilPage() {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { data: userProfile } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  let coachStudents: CoachStudent[] = [];
  if (userProfile?.module_coach) {
    const { data } = await supabase.from("coach_students").select("*").eq("coach_id", authUser.id).order("student_name");
    coachStudents = (data as CoachStudent[]) || [];
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-black">Mon profil</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gérez votre compte et vos préférences</p>
      </div>
      <SettingsForm user={userProfile} />
      <RiderProfileBlock user={userProfile as any} />
      {userProfile?.module_coach && (
        <GestionEleves initialStudents={coachStudents} />
      )}
      {/* Legal */}
      <div className="card p-0 overflow-hidden">
        <p className="px-4 pt-3 pb-2 text-2xs font-bold uppercase tracking-widest text-gray-400">Légal</p>
        <Link
          href="/mentions-legales"
          className="flex items-center justify-between px-4 py-3 border-t border-gray-100 hover:bg-gray-50 transition-colors text-sm text-gray-600 hover:text-black"
        >
          Mentions légales & confidentialité
          <ChevronRight className="h-4 w-4 text-gray-300" />
        </Link>
      </div>
    </div>
  );
}
