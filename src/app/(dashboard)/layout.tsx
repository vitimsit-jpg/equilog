import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const { data: userProfile } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (userProfile && !userProfile.user_type) {
    redirect("/onboarding");
  }

  const { data: horses } = await supabase
    .from("horses")
    .select("*")
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: true });

  return (
    <div className="flex h-screen bg-beige overflow-hidden">
      <Sidebar horses={horses || []} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={userProfile} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
