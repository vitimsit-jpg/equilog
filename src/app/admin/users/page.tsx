import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminUsersTable from "@/components/admin/AdminUsersTable";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; plan?: string; status?: string; page?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const page = Math.max(1, parseInt(searchParams.page || "1"));
  const perPage = 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = admin
    .from("users")
    .select("id, email, name, plan, user_type, status, created_at, last_seen_at, is_admin", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (searchParams.q) {
    query = query.or(`email.ilike.%${searchParams.q}%,name.ilike.%${searchParams.q}%`);
  }
  if (searchParams.plan) {
    query = query.eq("plan", searchParams.plan);
  }
  if (searchParams.status) {
    query = query.eq("status", searchParams.status);
  }

  const { data: users, count } = await query;

  // Get horse counts per user
  const userIds = (users || []).map((u) => u.id);
  const { data: horseCounts } = userIds.length
    ? await admin.from("horses").select("user_id").in("user_id", userIds)
    : { data: [] };

  const horseCountByUser: Record<string, number> = {};
  (horseCounts || []).forEach((h) => {
    horseCountByUser[h.user_id] = (horseCountByUser[h.user_id] || 0) + 1;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Utilisateurs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{count?.toLocaleString("fr") ?? 0} comptes</p>
        </div>
      </div>

      <AdminUsersTable
        users={users || []}
        horseCountByUser={horseCountByUser}
        total={count ?? 0}
        page={page}
        perPage={perPage}
        searchParams={searchParams}
      />
    </div>
  );
}
