import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import SharesManager from "@/components/shares/SharesManager";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function PartagePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: horse } = await supabase
    .from("horses")
    .select("id, name")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!horse) return notFound();

  const { data: sharesRaw } = await supabase
    .from("horse_shares")
    .select("*, shared_with_user:users!shared_with_user_id(name)")
    .eq("horse_id", params.id)
    .neq("status", "revoked")
    .order("created_at", { ascending: false });

  const shares = (sharesRaw || []).map((s) => ({
    ...s,
    shared_with_name: s.shared_with_user?.name ?? null,
    shared_with_user: undefined,
  }));

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/horses/${params.id}`} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-black">Gérer les accès</h1>
          <p className="text-sm text-gray-400">{horse.name}</p>
        </div>
      </div>

      <SharesManager horseId={params.id} initialShares={shares} />
    </div>
  );
}
