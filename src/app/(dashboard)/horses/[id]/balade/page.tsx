import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import BaladeTracker from "@/components/balade/BaladeTracker";

interface Props {
  params: { id: string };
}

export default async function BaladePage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return notFound();

  const { data: horse } = await supabase
    .from("horses")
    .select("id, name")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!horse) return notFound();

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <BaladeTracker horseId={horse.id} horseName={horse.name} />
    </div>
  );
}
