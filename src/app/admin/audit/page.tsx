import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const page = Math.max(1, parseInt(searchParams.page || "1"));
  const perPage = 40;
  const from = (page - 1) * perPage;

  const { data: logs, count } = await admin
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + perPage - 1);

  // Fetch admin emails separately (audit_logs.admin_id → auth.users, not joinable via PostgREST)
  const adminIds = Array.from(new Set((logs || []).map((l) => l.admin_id).filter(Boolean)));
  const adminEmailMap: Record<string, string> = {};
  if (adminIds.length) {
    const { data: admins } = await admin.from("users").select("id, email, name").in("id", adminIds);
    (admins || []).forEach((a) => { adminEmailMap[a.id] = a.email; });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">Audit logs</h1>
        <p className="text-sm text-gray-500 mt-0.5">Actions administrateurs</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left px-4 py-3 text-2xs font-bold uppercase tracking-widest text-gray-500">Date</th>
              <th className="text-left px-4 py-3 text-2xs font-bold uppercase tracking-widest text-gray-500">Admin</th>
              <th className="text-left px-4 py-3 text-2xs font-bold uppercase tracking-widest text-gray-500">Action</th>
              <th className="text-left px-4 py-3 text-2xs font-bold uppercase tracking-widest text-gray-500">Ressource</th>
              <th className="text-left px-4 py-3 text-2xs font-bold uppercase tracking-widest text-gray-500">Détails</th>
            </tr>
          </thead>
          <tbody>
            {(logs || []).map((log) => (
              <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                  {format(new Date(log.created_at), "dd MMM HH:mm", { locale: fr })}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {adminEmailMap[log.admin_id] || "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-orange bg-orange/10 px-2 py-0.5 rounded-lg">
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {log.resource_type}{log.resource_id && <span className="text-gray-600 ml-1">#{log.resource_id.slice(0, 8)}</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 font-mono max-w-xs truncate">
                  {JSON.stringify(log.details)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!logs || logs.length === 0) && (
          <div className="text-center py-12 text-gray-500 text-sm">Aucune entrée</div>
        )}
      </div>

      {count && count > perPage && (
        <div className="flex justify-end gap-2 text-sm">
          {page > 1 && (
            <a href={`/admin/audit?page=${page - 1}`} className="px-3 py-1.5 bg-white/10 rounded-lg text-white hover:bg-white/20">
              Précédent
            </a>
          )}
          {page * perPage < count && (
            <a href={`/admin/audit?page=${page + 1}`} className="px-3 py-1.5 bg-white/10 rounded-lg text-white hover:bg-white/20">
              Suivant
            </a>
          )}
        </div>
      )}
    </div>
  );
}
