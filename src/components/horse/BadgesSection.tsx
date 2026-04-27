import { createClient } from "@/lib/supabase/server";
import { BADGE_DEFS } from "@/lib/badges";
import { getNextBadge, type BadgeProgress } from "@/lib/badges/next";
import BadgesSectionClient, { type EarnedBadge } from "./BadgesSectionClient";

interface Props {
  horseId: string;
  progress: BadgeProgress;
}

export default async function BadgesSection({ horseId, progress }: Props) {
  const supabase = createClient();
  const { data } = await supabase
    .from("horse_badges")
    .select("badge_key, earned_at")
    .eq("horse_id", horseId);

  const earned: EarnedBadge[] = (data ?? []).map((b: any) => ({
    key: b.badge_key,
    earnedAt: b.earned_at,
  }));
  const earnedSet = new Set(earned.map((e) => e.key));
  const next = getNextBadge(earnedSet, progress);

  return (
    <BadgesSectionClient
      defs={BADGE_DEFS}
      earned={earned}
      total={BADGE_DEFS.length}
      next={
        next
          ? {
              key: next.def.key,
              emoji: next.def.emoji,
              label: next.def.label,
              current: next.current,
              target: next.target,
            }
          : null
      }
    />
  );
}
