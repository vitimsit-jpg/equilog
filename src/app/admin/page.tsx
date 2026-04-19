import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminAnalyticsCharts from "@/components/admin/AdminAnalyticsCharts";
import Link from "next/link";
import { TrendingUp } from "lucide-react";

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const [
    { count: totalUsers },
    { count: totalHorses },
    { data: signupsRaw },
    { data: usersForPlans },
    { data: usersForTypes },
    { data: active7 },
    { data: active30 },
    { data: sessions7 },
    { count: totalTraining },
    { count: totalHealth },
    { data: retainedRaw },
    { data: usersWithHorseRaw },
  ] = await Promise.all([
    admin.from("users").select("*", { count: "exact", head: true }),
    admin.from("horses").select("*", { count: "exact", head: true }),
    admin.rpc("get_daily_signups", { days_back: 30 }),
    admin.from("users").select("plan"),
    admin.from("users").select("user_type"),
    admin.rpc("get_active_users_count", { days_back: 7 }),
    admin.rpc("get_active_users_count", { days_back: 30 }),
    admin.rpc("get_sessions_count", { days_back: 7 }),
    admin.from("training_sessions").select("*", { count: "exact", head: true }).is("deleted_at", null),
    admin.from("health_records").select("*", { count: "exact", head: true }),
    admin.from("users")
      .select("id")
      .gte("last_seen_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .lt("created_at", new Date(Date.now() - 14 * 86400000).toISOString()),
    admin.from("horses").select("user_id"),
  ]);

  const signups = (signupsRaw || []).map((r: { signup_date: string; count: string | number }) => ({
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

  const retained = retainedRaw?.length ?? 0;
  const uniqueUsersWithHorse = new Set((usersWithHorseRaw || []).map((h) => h.user_id)).size;
  const conversionRate = totalUsers ? Math.round((uniqueUsersWithHorse / totalUsers) * 100) : 0;

  const stats = [
    { label: "Utilisateurs total", value: totalUsers ?? 0, sub: null },
    { label: "Chevaux total", value: totalHorses ?? 0, sub: null },
    { label: "Actifs 7j", value: Number(active7 ?? 0), sub: `${Number(active30 ?? 0)} sur 30j` },
    { label: "Sessions 7j", value: Number(sessions7 ?? 0), sub: null },
    { label: "Séances enregistrées", value: totalTraining ?? 0, sub: null },
    { label: "Actes de santé", value: totalHealth ?? 0, sub: null },
    { label: "Conversion (cheval)", value: `${conversionRate}%`, sub: `${uniqueUsersWithHorse} utilisateurs` },
    { label: "Rétention 7j (anciens)", value: retained, sub: "inscrits >14j" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vue d&apos;ensemble de la plateforme</p>
        </div>
        <Link
          href="/admin/comportement"
          className="flex items-center gap-2 px-4 py-2 bg-orange text-white text-sm font-semibold rounded-xl hover:bg-orange/90 transition-colors"
        >
          <TrendingUp className="h-4 w-4" />
          Comportement →
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-2xs text-gray-500 uppercase tracking-widest font-bold mb-1">{s.label}</p>
            <p className="text-3xl font-black text-white">
              {typeof s.value === "number" ? s.value.toLocaleString("fr") : s.value}
            </p>
            {s.sub && <p className="text-xs text-gray-600 mt-1">{s.sub}</p>}
          </div>
        ))}
      </div>

      <AdminAnalyticsCharts
        signups={signups}
        planCounts={planCounts}
        typeCounts={typeCounts}
      />
    </div>
  );
}
