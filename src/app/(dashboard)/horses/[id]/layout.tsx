import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CoachChat from "@/components/coaching/CoachChat";
import HorseTabNav from "@/components/horse/HorseTabNav";
import HorseSwipeNav from "@/components/horse/HorseSwipeNav";
import HeroActionsWrapper from "@/components/horse/HeroActionsWrapper";
import HorseEditModal from "@/components/horse/HorseEditModal";
import RecalculateButton from "@/components/horse-index/RecalculateButton";
import ShareButton from "@/components/horse/ShareButton";
import PdfDownloadButton from "@/components/pdf/PdfDownloadButton";

interface Props {
  children: React.ReactNode;
  params: { id: string };
}

export default async function HorseLayout({ children, params }: Props) {
  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return notFound();

  const { data: horse } = await supabase
    .from("horses")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", authUser.id)
    .single();

  if (!horse) return notFound();

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 14);

  const { data: userProfile } = await supabase.from("users").select("plan").eq("id", authUser.id).single();
  const plan = userProfile?.plan ?? "starter";

  const [{ data: recentComps }, { data: scores }] = await Promise.all([
    supabase
      .from("competitions")
      .select("id")
      .eq("horse_id", horse.id)
      .gte("date", weekAgo.toISOString().split("T")[0])
      .limit(1),
    supabase
      .from("horse_scores")
      .select("score, score_breakdown, computed_at")
      .eq("horse_id", horse.id)
      .order("computed_at", { ascending: false })
      .limit(1),
  ]);

  const currentScore = scores?.[0] ?? null;
  const avatarUrl = (horse as any).avatar_url as string | null;

  const metaParts = [
    horse.breed,
    (horse as any).sexe === "hongre"
      ? "Hongre"
      : (horse as any).sexe === "jument"
      ? "Jument"
      : (horse as any).sexe === "etalon"
      ? "Étalon"
      : null,
    horse.discipline,
    horse.birth_year ? `Né en ${horse.birth_year}` : null,
  ].filter(Boolean);

  return (
    <>
      {/* Full-bleed hero — negative margin escapes main's padding */}
      <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6">
        {/* Photo zone */}
        <div className="relative h-56 md:h-72">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={horse.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1A1A1A] to-[#2D1A0E]" />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40" />

          {/* Top bar: back + actions */}
          <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-4">
            <Link
              href="/dashboard"
              className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <HeroActionsWrapper>
              <PdfDownloadButton
                type="fiche"
                horse={horse}
                score={
                  currentScore
                    ? {
                        score: currentScore.score,
                        score_breakdown:
                          currentScore.score_breakdown as Record<
                            string,
                            number
                          > | null,
                        computed_at: currentScore.computed_at,
                      }
                    : null
                }
              />
              {horse.share_horse_index && (
                <ShareButton horseId={horse.id} horseName={horse.name} />
              )}
              <RecalculateButton horseId={horse.id} />
              <HorseEditModal horse={horse as any} />
            </HeroActionsWrapper>
          </div>

          {/* Bottom: horse name + meta + score badge */}
          <div className="absolute bottom-0 inset-x-0 px-4 pb-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-black text-white truncate leading-tight">
                {horse.name}
              </h1>
              {metaParts.length > 0 && (
                <p className="text-xs text-gray-300 mt-0.5 truncate">
                  {metaParts.join(" · ")}
                </p>
              )}
              {((horse as any).objectif_saison || (horse as any).niveau) && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {(horse as any).niveau && `Niveau ${(horse as any).niveau}`}
                  {(horse as any).niveau && (horse as any).objectif_saison && " · "}
                  {(horse as any).objectif_saison && `🎯 ${(horse as any).objectif_saison}`}
                </p>
              )}
            </div>

            {currentScore && (
              <div className="flex-shrink-0 text-center bg-black/50 backdrop-blur-sm border border-white/20 rounded-2xl px-3.5 py-2.5">
                <div className="text-2xl font-black text-white leading-none">
                  {currentScore.score}
                </div>
                <div className="text-2xs text-gray-400 mt-0.5 tracking-wide uppercase">
                  Index
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab navigation */}
        <HorseTabNav horseId={horse.id} />
      </div>

      {/* Page content — swipeable between tabs on mobile */}
      <HorseSwipeNav horseId={horse.id}>
        <div className="mt-6">{children}</div>
      </HorseSwipeNav>

      {plan !== "starter" && (
        <CoachChat
          horseId={horse.id}
          horseName={horse.name}
          hasRecentCompetition={(recentComps || []).length > 0}
        />
      )}
    </>
  );
}
