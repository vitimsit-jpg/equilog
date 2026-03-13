"use client";

import { useState } from "react";
import Link from "next/link";
import { Dumbbell, Trophy, Medal } from "lucide-react";
import { formatDate, getScoreColor } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import HorseAvatar from "@/components/ui/HorseAvatar";
import FeedReactionButton from "./FeedReactionButton";
import FeedMediaPreview from "./FeedMediaPreview";
import FeedComments from "./FeedComments";
import FeedShareButton from "./FeedShareButton";

const TRAINING_TYPE_LABELS: Record<string, string> = {
  dressage: "Dressage", saut: "Saut", endurance: "Endurance", cso: "CSO",
  cross: "Cross", travail_a_pied: "Travail à pied", longe: "Longe",
  galop: "Galop", plat: "Plat", marcheur: "Marcheur", autre: "Séance",
};

type FeedFilter = "all" | "session" | "competition";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FeedItem = { date: string; type: "session" | "competition"; data: any; horse: any };

interface Props {
  feed: FeedItem[];
  reactionCountsMap: Record<string, Record<string, number>>;
  myReactionMap: Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  commentsByItem: Record<string, any[]>;
  currentUserId: string;
  isCompetitor: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rankedHorses: any[];
  latestScoreByHorse: Record<string, number>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ecurieHorses: any[];
}

export default function CommunauteFeed({
  feed,
  reactionCountsMap,
  myReactionMap,
  commentsByItem,
  currentUserId,
  isCompetitor,
  rankedHorses,
  latestScoreByHorse,
  ecurieHorses,
}: Props) {
  const [filter, setFilter] = useState<FeedFilter>("all");

  const filtered = filter === "all" ? feed : feed.filter((item) => item.type === filter);

  const tabs: { id: FeedFilter; label: string; count: number }[] = [
    { id: "all", label: "Tout", count: feed.length },
    { id: "session", label: "Séances", count: feed.filter((i) => i.type === "session").length },
    { id: "competition", label: "Concours", count: feed.filter((i) => i.type === "competition").length },
  ];

  return (
    <div className="space-y-5">
      {/* Active horses highlights bar */}
      {ecurieHorses.length > 0 && (
        <div className="overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <div className="flex gap-3 w-max">
            {ecurieHorses.map((horse) => {
              const score = latestScoreByHorse[horse.id];
              return (
                <Link
                  key={horse.id}
                  href={`/horses/${horse.id}`}
                  className="flex flex-col items-center gap-1.5 w-14 flex-shrink-0 group"
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full ring-2 ring-offset-1 ring-orange/60 group-hover:ring-orange transition-all">
                      <HorseAvatar name={horse.name} photoUrl={horse.avatar_url} size="sm" rounded="full" />
                    </div>
                    {score !== undefined && (
                      <span
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-2xs font-black px-1 py-0 rounded-full bg-white border border-gray-100 leading-tight"
                        style={{ color: getScoreColor(score) }}
                      >
                        {score}
                      </span>
                    )}
                  </div>
                  <p className="text-2xs text-gray-500 text-center truncate w-full leading-tight">
                    {horse.name.split(" ")[0]}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feed */}
        <div className={`space-y-3 ${isCompetitor ? "lg:col-span-2" : "lg:col-span-3"}`}>
          {/* Filter tabs */}
          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  filter === tab.id
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1 text-2xs ${filter === tab.id ? "text-white/60" : "text-gray-400"}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-sm text-gray-400">Aucune activité pour ce filtre.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((item, idx) => {
                const reactionKey = `${item.type}:${item.data.id}`;
                const itemCounts = reactionCountsMap[reactionKey] ?? {};
                const myReaction = myReactionMap[reactionKey] ?? null;
                const itemComments = commentsByItem[item.data.id] || [];

                return (
                  <div key={idx} className="card flex items-start gap-3 py-3">
                    <HorseAvatar name={item.horse.name} photoUrl={item.horse.avatar_url} size="sm" rounded="full" />

                    <div className="flex-1 min-w-0">
                      {item.type === "session" && (
                        <>
                          <p className="text-sm font-semibold text-black">
                            {item.horse.name}
                            <span className="font-normal text-gray-500">
                              {" "}a travaillé · {TRAINING_TYPE_LABELS[item.data.type] || item.data.type}
                            </span>
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-400">
                              <Dumbbell className="h-3 w-3 inline mr-1" />
                              {item.data.duration_min}min
                            </span>
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-1.5 h-2.5 rounded-full ${i < item.data.intensity ? "bg-orange" : "bg-gray-200"}`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-400">{formatDate(item.date)}</span>
                          </div>
                          {item.data.notes && (
                            <p className="text-xs text-gray-500 mt-1 italic">&ldquo;{item.data.notes}&rdquo;</p>
                          )}
                          {item.data.media_urls?.length > 0 && (
                            <FeedMediaPreview mediaUrls={item.data.media_urls} />
                          )}
                        </>
                      )}

                      {item.type === "competition" && (
                        <>
                          <p className="text-sm font-semibold text-black">
                            {item.horse.name}
                            <span className="font-normal text-gray-500"> en concours · {item.data.event_name}</span>
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-400">
                              <Trophy className="h-3 w-3 inline mr-1" />
                              {item.data.discipline} {item.data.level}
                            </span>
                            {item.data.result_rank && item.data.total_riders && (
                              <Badge variant={item.data.result_rank <= 3 ? "orange" : "gray"}>
                                {item.data.result_rank}/{item.data.total_riders}
                              </Badge>
                            )}
                            <span className="text-xs text-gray-400">{formatDate(item.date)}</span>
                          </div>
                          {item.data.media_urls?.length > 0 && (
                            <FeedMediaPreview mediaUrls={item.data.media_urls} />
                          )}
                        </>
                      )}

                      {/* Reactions + Share */}
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <FeedReactionButton
                          itemType={item.type}
                          itemId={item.data.id}
                          initialCounts={itemCounts}
                          initialMyReaction={myReaction}
                        />
                        <FeedShareButton
                          horseName={item.horse.name}
                          horseId={item.horse.id}
                          shareHorseIndex={item.horse.share_horse_index}
                          itemType={item.type}
                          itemData={item.data}
                        />
                      </div>
                      <FeedComments
                        itemType={item.type}
                        itemId={item.data.id}
                        currentUserId={currentUserId}
                        initialComments={itemComments}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rankings */}
        {isCompetitor && (
          <div className="space-y-3">
            <h2 className="font-bold text-black flex items-center gap-2">
              <Medal className="h-4 w-4 text-orange" />
              Classement écurie
            </h2>
            <div className="card">
              {rankedHorses.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">
                  Aucun classement disponible.<br />Activez le partage Horse Index.
                </p>
              ) : (
                <div className="space-y-2">
                  {rankedHorses.map((horse, idx) => {
                    const score = latestScoreByHorse[horse.id];
                    return (
                      <div key={horse.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black w-5 ${idx === 0 ? "text-yellow-500" : idx === 1 ? "text-gray-400" : idx === 2 ? "text-orange-400" : "text-gray-300"}`}>
                            {idx + 1}
                          </span>
                          <HorseAvatar name={horse.name} photoUrl={horse.avatar_url} size="xs" rounded="full" />
                          <div>
                            <p className="text-xs font-semibold text-black">{horse.name}</p>
                            <p className="text-2xs text-gray-400">{horse.discipline || "—"}</p>
                          </div>
                        </div>
                        {score !== undefined ? (
                          <p className="text-base font-black" style={{ color: getScoreColor(score) }}>{score}</p>
                        ) : (
                          <p className="text-xs text-gray-300">—</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
