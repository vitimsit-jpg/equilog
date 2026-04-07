import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import VideoAnalysis from "@/components/horses/VideoAnalysis";
import UpgradeBanner from "@/components/ui/UpgradeBanner";

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

  const adminClient = createAdminClient();
  const { data: userProfile } = await adminClient
    .from("users")
    .select("plan")
    .eq("id", authUser.id)
    .single();

  const plan = userProfile?.plan ?? "starter";

  if (plan === "starter") {
    return (
      <div className="max-w-2xl mx-auto">
        <UpgradeBanner feature="Analyse Vidéo IA" requiredPlan="pro" />
      </div>
    );
  }

  const { data: dbHistory } = await supabase
    .from("video_analyses")
    .select("id, allure, score, posture_cheval, position_cavalier, points_forts, axes_amelioration, conseil_principal, created_at, video_url, title, notes")
    .eq("horse_id", params.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const history = (dbHistory ?? []).map((r) => ({
    id: r.id,
    allure: r.allure ?? "",
    score: r.score ?? 0,
    posture_cheval: r.posture_cheval ?? "",
    position_cavalier: r.position_cavalier,
    points_forts: r.points_forts ?? [],
    axes_amelioration: r.axes_amelioration ?? [],
    conseil_principal: r.conseil_principal ?? "",
    date: r.created_at,
    video_url: r.video_url ?? null,
    title: r.title ?? null,
    notes: r.notes ?? null,
  }));

  return <VideoAnalysis horse={horse} initialHistory={history} userId={authUser.id} />;
}
