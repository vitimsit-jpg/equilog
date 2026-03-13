import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: { event?: string; page?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const page = Math.max(1, parseInt(searchParams.page || "1"));
  const perPage = 50;
  const from = (page - 1) * perPage;

  // Top events summary
  const { data: topEvents } = await admin
    .from("event_logs")
    .select("event_name, event_category")
    .order("created_at", { ascending: false })
    .limit(1000);

  const eventCounts: Record<string, number> = {};
  (topEvents || []).forEach((e) => {
    eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1;
  });
  const topSorted = Object.entries(eventCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  let query = admin
    .from("event_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + perPage - 1);

  if (searchParams.event) {
    query = query.eq("event_name", searchParams.event);
  }

  const { data: logs, count } = await query;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">Event logs</h1>
        <p className="text-sm text-gray-500 mt-0.5">Analytics produit (1 000 derniers)</p>
      </div>

      {/* Top events */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <p className="text-sm font-bold text-white mb-3">Top événements</p>
        <div className="flex flex-wrap gap-2">
          {topSorted.map(([name, cnt]) => (
            <a
              key={name}
              href={`/admin/events?event=${encodeURIComponent(name)}`}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs transition-colors"
            >
              <span className="text-orange font-mono">{name}</span>
              <span className="text-gray-500 font-semibold">{cnt}</span>
            </a>
          ))}
        </div>
        {searchParams.event && (
          <a href="/admin/events" className="mt-3 block text-xs text-gray-500 hover:text-white">
            ← Voir tous les événements
          </a>
        )}
      </div>

      {/* Logs table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-3 text-2xs font-bold uppercase tracking-widest text-gray-500">Date</th>
              <th className="text-left px-4 py-3 text-2xs font-bold uppercase tracking-widest text-gray-500">Événement</th>
              <th className="text-left px-4 py-3 text-2xs font-bold uppercase tracking-widest text-gray-500">Catégorie</th>
              <th className="text-left px-4 py-3 text-2xs font-bold uppercase tracking-widest text-gray-500">Page</th>
              <th className="text-left px-4 py-3 text-2xs font-bold uppercase tracking-widest text-gray-500">User</th>
            </tr>
          </thead>
          <tbody>
            {(logs || []).map((log) => (
              <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {format(new Date(log.created_at), "dd MMM HH:mm", { locale: fr })}
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-orange">{log.event_name}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{log.event_category}</td>
                <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate">{log.page_path || "—"}</td>
                <td className="px-4 py-3 text-xs text-gray-600 font-mono">{log.user_id?.slice(0, 8) || "anon"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!logs || logs.length === 0) && (
          <div className="text-center py-12 text-gray-500 text-sm">Aucun événement</div>
        )}
      </div>

      {count && count > perPage && (
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">{count.toLocaleString("fr")} entrées</span>
          <div className="flex gap-2">
            {page > 1 && (
              <a href={`/admin/events?page=${page - 1}${searchParams.event ? `&event=${searchParams.event}` : ""}`} className="px-3 py-1.5 bg-white/10 rounded-lg text-white hover:bg-white/20">
                Précédent
              </a>
            )}
            {page * perPage < count && (
              <a href={`/admin/events?page=${page + 1}${searchParams.event ? `&event=${searchParams.event}` : ""}`} className="px-3 py-1.5 bg-white/10 rounded-lg text-white hover:bg-white/20">
                Suivant
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
