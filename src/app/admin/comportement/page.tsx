import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminFunnelChart from "@/components/admin/AdminFunnelChart";
import AdminBehaviorCharts from "@/components/admin/AdminBehaviorCharts";

export default async function AdminComportementPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const [
    { data: funnelRaw },
    { data: eventsPerDayRaw },
    { data: topPagesRaw },
    { data: topEventsRaw },
  ] = await Promise.all([
    admin.rpc("get_funnel_stats"),
    admin.rpc("get_events_per_day", { days_back: 30 }),
    admin.rpc("get_top_pages", { limit_n: 10 }),
    // Top events last 7 days
    admin.from("event_logs")
      .select("event_name, event_category")
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .limit(2000),
  ]);

  // Build funnel steps
  const f = funnelRaw as {
    total_users: number;
    with_user_type: number;
    with_horse: number;
    with_training: number;
    with_health: number;
    retained_7d: number;
  } | null;

  const total = f?.total_users ?? 0;
  const funnelSteps = [
    { label: "Inscriptions", count: total, pct: 100 },
    { label: "Onboarding complété", count: f?.with_user_type ?? 0, pct: total ? Math.round(((f?.with_user_type ?? 0) / total) * 100) : 0 },
    { label: "Premier cheval créé", count: f?.with_horse ?? 0, pct: total ? Math.round(((f?.with_horse ?? 0) / total) * 100) : 0 },
    { label: "Première séance", count: f?.with_training ?? 0, pct: total ? Math.round(((f?.with_training ?? 0) / total) * 100) : 0 },
    { label: "Premier soin enregistré", count: f?.with_health ?? 0, pct: total ? Math.round(((f?.with_health ?? 0) / total) * 100) : 0 },
    { label: "Rétention 7j", count: f?.retained_7d ?? 0, pct: total ? Math.round(((f?.retained_7d ?? 0) / total) * 100) : 0 },
  ];

  // Events per day
  const eventsPerDay = (eventsPerDayRaw || []).map((r: { event_date: string; event_count: number }) => ({
    date: r.event_date,
    count: Number(r.event_count),
  }));

  // Top pages
  const topPages = (topPagesRaw || []).map((r: { page: string; visit_count: number }) => ({
    page: r.page,
    count: Number(r.visit_count),
  }));

  // Top events
  const eventCountsMap: Record<string, number> = {};
  (topEventsRaw || []).forEach((e) => {
    eventCountsMap[e.event_name] = (eventCountsMap[e.event_name] || 0) + 1;
  });
  const topEvents = Object.entries(eventCountsMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Comportement utilisateur</h1>
        <p className="text-sm text-gray-500 mt-0.5">Funnel de conversion, parcours et engagement</p>
      </div>

      {/* Funnel */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <p className="text-sm font-bold text-white mb-5">Funnel de conversion</p>
        <AdminFunnelChart steps={funnelSteps} />
      </div>

      <AdminBehaviorCharts
        eventsPerDay={eventsPerDay}
        topPages={topPages}
        topEvents={topEvents}
      />
    </div>
  );
}
