import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import VideoAnalysis from "@/components/horses/VideoAnalysis";

interface Props {
  params: { id: string };
}

export default async function VideoPage({ params }: Props) {
  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return notFound();

  const { data: horse } = await supabase
    .from("horses")
    .select("id, name, discipline")
    .eq("id", params.id)
    .eq("user_id", authUser.id)
    .single();

  if (!horse) return notFound();

  return <VideoAnalysis horse={horse} />;
}
