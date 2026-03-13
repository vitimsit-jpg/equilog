import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminAnalyticsCharts from "@/components/admin/AdminAnalyticsCharts";

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  // Parallel fetches
  const [
    { count: totalUsers },
    { count: totalHorses },
    { data: signupsRaw },
    { data: usersForPlans },
    { data: usersForTypes },
    { data: active7 },
    { data: active30 },
  ] = await Promise.all([
    admin.from("users").select("*", { count: "exact", head: true }),
    admin.from("horses").select("*", { count: "exact", head: true }),
    admin.rpc("get_daily_signups", { days_back: 30 }),
    admin.from("users").select("plan"),
    admin.from("users").select("user_type"),
    admin.rpc("get_active_users_count", { days_back: 7 }),
    admin.rpc("get_active_users_count", { days_back: 30 }),
  ]);

  const signups: { signup_date: string; count: number }[] = (signupsRaw || []).map((r: { signup_date: string; count: string | number }) => ({
    signup_date: r.signup_date,
    count: Number(r.count),
  }));

  const planCountsMap: Record<string, number> = {};
  (usersForPlans || []).forEach((u) => { planCountsMap[u.plan] = (planCountsMap[u.plan] || 0) + 1; });
  const planCounts = Object.entries(planCountsMap).map(([name, value]) => ({ name, value }));

  const typeCountsMap: Record<string, number> = {};
  (usersForTypes || []).forEach((u) => {
    const t = u.user_type || "unknown";
    typeCountsMap[t] = (typeCountsMap[t] || 0) + 1;
  });
  const typeCounts = Object.entries(typeCountsMap).map(([name, value]) => ({ name, value }));

  const stats = [
    { label: "Utilisateurs total", value: totalUsers ?? 0 },
    { label: "Chevaux total", value: totalHorses ?? 0 },
    { label: "Actifs 7j", value: Number(active7 ?? 0) },
    { label: "Actifs 30j", value: Number(active30 ?? 0) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Vue d&apos;ensemble de la plateforme</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-2xs text-gray-500 uppercase tracking-widest font-bold mb-1">{s.label}</p>
            <p className="text-3xl font-black text-white">{s.value.toLocaleString("fr")}</p>
          </div>
        ))}
      </div>

      <AdminAnalyticsCharts
        signups={signups}
        planCounts={planCounts || []}
        typeCounts={typeCounts || []}
      />
    </div>
  );
}
