import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ReceivedSharesList from "@/components/shares/ReceivedSharesList";

export default async function PartagesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Auto-accepter les invitations pending dont l'email correspond
  if (user.email) {
    await supabase
      .from("horse_shares")
      .update({ shared_with_user_id: user.id, status: "active" })
      .eq("shared_with_email", user.email)
      .eq("status", "pending");
  }

  const { data: shares } = await supabase
    .from("horse_shares")
    .select(`
      *,
      horse:horses(id, name, breed, avatar_url, horse_index_mode),
      owner:users!invited_by(name, email)
    `)
    .eq("shared_with_user_id", user.id)
    .neq("status", "revoked")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-black">Accès partagés</h1>
        <p className="text-sm text-gray-400 mt-1">Chevaux auxquels vous avez accès via invitation.</p>
      </div>
      <ReceivedSharesList initialShares={shares || []} />
    </div>
  );
}
