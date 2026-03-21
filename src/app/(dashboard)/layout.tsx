import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import ServiceWorkerRegistrar from "@/components/layout/ServiceWorkerRegistrar";
import OfflineBanner from "@/components/pwa/OfflineBanner";

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

  const isOnboarded =
    (userProfile as any)?.onboarding_completed ||
    userProfile?.user_type ||
    (userProfile as any)?.profile_type;
  if (userProfile && !isOnboarded) {
    redirect("/onboarding");
  }

  const { data: horses } = await supabase
    .from("horses")
    .select("*")
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: true });

  const horseIds = (horses || []).map((h) => h.id);
  const today = new Date().toISOString().split("T")[0];
  const { data: overdueRecords } = horseIds.length
    ? await supabase
        .from("health_records")
        .select("horse_id")
        .in("horse_id", horseIds)
        .not("next_date", "is", null)
        .lt("next_date", today)
    : { data: [] };

  const overdueByHorse: Record<string, number> = {};
  (overdueRecords || []).forEach((r) => {
    overdueByHorse[r.horse_id] = (overdueByHorse[r.horse_id] || 0) + 1;
  });

  return (
    <div className="flex h-screen bg-[#F5F5F5] overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar
          horses={horses || []}
          currentHorseId={undefined}
          userType={userProfile?.user_type ?? null}
          profileType={(userProfile as any)?.profile_type ?? null}
          moduleGerant={(userProfile as any)?.module_gerant ?? false}
          overdueByHorse={overdueByHorse}
          isAdmin={userProfile?.is_admin ?? false}
        />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={userProfile} />
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 scroll-smooth">{children}</main>
      </div>
      <MobileBottomNav horses={horses || []} overdueByHorse={overdueByHorse} />
      <ServiceWorkerRegistrar />
    </div>
  );
}
