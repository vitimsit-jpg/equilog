import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import CoachChat from "@/components/coaching/CoachChat";

interface Props {
  children: React.ReactNode;
  params: { id: string };
}

export default async function HorseLayout({ children, params }: Props) {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return notFound();

  const { data: horse } = await supabase
    .from("horses")
    .select("id, name, user_id")
    .eq("id", params.id)
    .eq("user_id", authUser.id)
    .single();

  if (!horse) return notFound();

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 14);
  const { data: recentComps } = await supabase
    .from("competitions")
    .select("id")
    .eq("horse_id", horse.id)
    .gte("date", weekAgo.toISOString().split("T")[0])
    .limit(1);

  return (
    <>
      {children}
      <CoachChat
        horseId={horse.id}
        horseName={horse.name}
        hasRecentCompetition={(recentComps || []).length > 0}
      />
    </>
  );
}
