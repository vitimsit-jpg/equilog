import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SettingsForm from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { data: userProfile } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-black">Paramètres</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gérez votre compte et vos préférences</p>
      </div>
      <SettingsForm user={userProfile} />
    </div>
  );
}
