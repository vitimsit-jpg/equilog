// Supabase Edge Function: calculate-horse-index
// Scheduled via cron: every day at 3h
// Recalculates Horse Index for all horses with recent activity

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { differenceInDays } from "https://esm.sh/date-fns@3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Simplified calculator (mirrors src/lib/horse-index/calculator.ts)
function calculateScore(data: {
  trainingSessions: any[];
  healthRecords: any[];
  competitions: any[];
  wearableData: any[];
}): { total: number; breakdown: Record<string, number> } {
  const now = new Date();
  const hasWearables = data.wearableData.length > 0;

  const regularite = calculateRegularite(data.trainingSessions, now);
  const progression = calculateProgression(data.trainingSessions, data.competitions, now);
  const sante = calculateSante(data.healthRecords, now);
  const recuperation = calculateRecuperation(data.trainingSessions, now);
  const wearables = hasWearables ? 7 : 0;

  let total: number;
  if (hasWearables) {
    total = regularite + progression + sante + recuperation + wearables;
  } else {
    const baseTotal = regularite + progression + sante + recuperation;
    total = Math.round((baseTotal / 90) * 100);
  }

  return {
    total: Math.min(100, Math.max(0, total)),
    breakdown: {
      regularite: Math.round(regularite),
      progression: Math.round(progression),
      sante: Math.round(sante),
      recuperation: Math.round(recuperation),
      wearables: Math.round(wearables),
      has_wearables: hasWearables ? 1 : 0,
    },
  };
}

function calculateRegularite(sessions: any[], now: Date): number {
  const last30 = sessions.filter((s) => differenceInDays(now, new Date(s.date)) <= 30);
  const last90 = sessions.filter((s) => differenceInDays(now, new Date(s.date)) <= 90);
  if (last90.length === 0) return 0;
  const currentWeekly = last30.length / 4.3;
  let score = Math.min(25, (currentWeekly / 4) * 25);
  return score;
}

function calculateProgression(sessions: any[], competitions: any[], now: Date): number {
  if (sessions.length < 4) return 12;
  const last180 = sessions.filter((s) => differenceInDays(now, new Date(s.date)) <= 180);
  if (last180.length === 0) return 0;
  const avgFeeling = last180.reduce((s: number, t: any) => s + t.feeling, 0) / last180.length;
  return Math.min(25, (avgFeeling / 5) * 25);
}

function calculateSante(healthRecords: any[], now: Date): number {
  const checks = [
    { type: "vaccin", maxDays: 180, weight: 5 },
    { type: "vermifuge", maxDays: 90, weight: 4 },
    { type: "ferrage", maxDays: 35, weight: 4 },
    { type: "dentiste", maxDays: 365, weight: 4 },
    { type: "osteo", maxDays: 180, weight: 3, optional: true },
  ];
  let score = 0;
  for (const check of checks) {
    const records = healthRecords
      .filter((r: any) => r.type === check.type)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (records.length === 0) continue;
    const last = records[0];
    const daysSince = differenceInDays(now, new Date(last.date));
    if (daysSince <= check.maxDays) score += check.weight;
    else if (daysSince <= check.maxDays * 1.2) score += check.weight * 0.5;
  }
  return Math.min(20, score);
}

function calculateRecuperation(sessions: any[], now: Date): number {
  const last14 = sessions.filter((s: any) => differenceInDays(now, new Date(s.date)) <= 14);
  if (last14.length === 0) return 10;
  const avgFeeling = last14.reduce((s: number, t: any) => s + t.feeling, 0) / last14.length;
  return Math.min(20, (avgFeeling / 5) * 20);
}

Deno.serve(async () => {
  // Get all horses that have had activity in the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: activeHorses, error: horsesError } = await supabase
    .from("horses")
    .select("id, discipline, region");

  if (horsesError) {
    return new Response(JSON.stringify({ error: horsesError.message }), { status: 500 });
  }

  let processed = 0;
  let errors = 0;

  for (const horse of activeHorses || []) {
    try {
      const [
        { data: trainingSessions },
        { data: healthRecords },
        { data: competitions },
        { data: wearableData },
      ] = await Promise.all([
        supabase.from("training_sessions").select("*").eq("horse_id", horse.id),
        supabase.from("health_records").select("*").eq("horse_id", horse.id),
        supabase.from("competitions").select("*").eq("horse_id", horse.id),
        supabase.from("wearable_data").select("*").eq("horse_id", horse.id),
      ]);

      // Only calculate if horse has at least some data (14+ days)
      const allSessions = trainingSessions || [];
      if (allSessions.length === 0 && (healthRecords || []).length === 0) continue;

      const { total, breakdown } = calculateScore({
        trainingSessions: allSessions,
        healthRecords: healthRecords || [],
        competitions: competitions || [],
        wearableData: wearableData || [],
      });

      await supabase.from("horse_scores").insert({
        horse_id: horse.id,
        score: total,
        score_breakdown: breakdown,
        computed_at: new Date().toISOString(),
        region: horse.region,
      });

      processed++;
    } catch (e) {
      console.error(`Error for horse ${horse.id}:`, e);
      errors++;
    }
  }

  return new Response(JSON.stringify({ success: true, processed, errors }), {
    headers: { "Content-Type": "application/json" },
  });
});
