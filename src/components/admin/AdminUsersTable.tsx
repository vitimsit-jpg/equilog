"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Search, ChevronLeft, ChevronRight, Shield, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

const PLAN_BADGE: Record<string, string> = {
  starter: "bg-gray-700 text-gray-300",
  pro: "bg-orange/20 text-orange",
  ecurie: "bg-purple-500/20 text-purple-300",
};
const TYPE_LABELS: Record<string, string> = {
  loisir: "Loisir",
  competition: "Compét.",
  pro: "Pro",
  gerant_cavalier: "Gérant cav.",
  coach: "Coach",
  gerant_ecurie: "Gérant écurie",
};

interface AdminUser {
  id: string;
  email: string;
  name: string;
  plan: string;
  user_type: string | null;
  status: string;
  created_at: string;
  last_seen_at: string | null;
  is_admin: boolean;
}

interface Props {
  users: AdminUser[];
  horseCountByUser: Record<string, number>;
  total: number;
  page: number;
  perPage: number;
  searchParams: { q?: string; plan?: string; status?: string };
}

export default function AdminUsersTable({ users, horseCountByUser, total, page, perPage, searchParams }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(searchParams.q || "");

  const totalPages = Math.ceil(total / perPage);

  function buildUrl(params: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = { ...searchParams, ...params };
    Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v); });
    return `/admin/users?${p.toString()}`;
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(buildUrl({ q: search || undefined, page: "1" }));
  }

  async function suspendUser(userId: string) {
    await fetch("/api/admin/users/suspend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher email ou nom…"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-orange/50"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-orange text-white text-sm font-semibold rounded-xl hover:bg-orange/90">
            Chercher
          </button>
        </form>

        <select
          value={searchParams.plan || ""}
          onChange={(e) => router.push(buildUrl({ plan: e.target.value || undefined, page: "1" }))}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
        >
          <option value="">Tous les plans</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="ecurie">Écurie</option>
        </select>

        <select
          value={searchParams.status || ""}
          onChange={(e) => router.push(buildUrl({ status: e.target.value || undefined, page: "1" }))}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
        >
          <option value="">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="suspended">Suspendu</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-2xs font-bold uppercase tracking-widest text-gray-500">Utilisateur</th>
                <th className="text-left px-4 py-3 text-2xs font-bold uppercase tracking-widest text-gray-500">Plan</th>
                <th className="text-left px-4 py-3 text-2xs font-bold uppercase tracking-widest text-gray-500">Profil</th>
                <th className="text-left px-4 py-3 text-2xs font-bold uppercase tracking-widest text-gray-500">Chevaux</th>
                <th className="text-left px-4 py-3 text-2xs font-bold uppercase tracking-widest text-gray-500">Inscrit</th>
                <th className="text-left px-4 py-3 text-2xs font-bold uppercase tracking-widest text-gray-500">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium text-white flex items-center gap-1.5">
                          {u.name || "—"}
                          {u.is_admin && <Shield className="h-3 w-3 text-orange flex-shrink-0" />}
                        </p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-2xs font-semibold uppercase", PLAN_BADGE[u.plan] || "bg-gray-700 text-gray-300")}>
                      {u.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {TYPE_LABELS[u.user_type || ""] || u.user_type || "—"}
                  </td>
                  <td className="px-4 py-3 text-white font-semibold">
                    {horseCountByUser[u.id] || 0}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {format(new Date(u.created_at), "dd MMM yyyy", { locale: fr })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-2xs font-semibold",
                      u.status === "suspended" ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"
                    )}>
                      {u.status === "suspended" ? "Suspendu" : "Actif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!u.is_admin && u.status !== "suspended" && (
                      <button
                        onClick={() => suspendUser(u.id)}
                        title="Suspendre"
                        className="p-1.5 rounded-lg text-gray-600 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">Aucun utilisateur trouvé</div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {((page - 1) * perPage) + 1}–{Math.min(page * perPage, total)} sur {total.toLocaleString("fr")}
          </span>
          <div className="flex gap-2">
            <a
              href={page > 1 ? buildUrl({ page: String(page - 1) }) : "#"}
              className={cn("p-2 rounded-lg border border-white/10 transition-colors", page > 1 ? "text-white hover:bg-white/10" : "text-gray-700 pointer-events-none")}
            >
              <ChevronLeft className="h-4 w-4" />
            </a>
            <a
              href={page < totalPages ? buildUrl({ page: String(page + 1) }) : "#"}
              className={cn("p-2 rounded-lg border border-white/10 transition-colors", page < totalPages ? "text-white hover:bg-white/10" : "text-gray-700 pointer-events-none")}
            >
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
