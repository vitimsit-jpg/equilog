import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { addWeeks, subWeeks, format } from "date-fns";
import TableauHebdomadaire from "@/components/planning/TableauHebdomadaire";

export default async function PlanningPage() {
  const supabase = createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const { data: userProfile } = await supabase
    .from("users")
    .select("id, name, profile_type, module_coach, module_gerant")
    .eq("id", authUser.id)
    .single();

  const { data: horses } = await supabase
    .from("horses")
    .select("id, name, avatar_url, horse_index_mode, ecurie")
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: true });

  if (!horses || horses.length === 0) {
    redirect("/dashboard");
  }

  const horseIds = horses.map((h) => h.id);

  // ±4 semaines autour de la semaine courante
  const now = new Date();
  const rangeStart = format(subWeeks(now, 4), "yyyy-MM-dd");
  const rangeEnd = format(addWeeks(now, 4), "yyyy-MM-dd");

  const { data: sessions } = await supabase
    .from("training_sessions")
    .select("*")
    .in("horse_id", horseIds)
    .is("deleted_at", null)
    .gte("date", rangeStart)
    .lte("date", rangeEnd)
    .order("date", { ascending: true });

  const { data: plannedSessions } = await supabase
    .from("training_planned_sessions")
    .select("*")
    .in("horse_id", horseIds)
    .is("deleted_at", null)
    .gte("date", rangeStart)
    .lte("date", rangeEnd)
    .order("date", { ascending: true });

  return (
    <TableauHebdomadaire
      horses={horses}
      sessions={sessions || []}
      plannedSessions={plannedSessions || []}
      userId={authUser.id}
      userName={userProfile?.name || "Moi"}
      moduleGerant={userProfile?.module_gerant ?? false}
      moduleCoach={userProfile?.module_coach ?? false}
      profileType={userProfile?.profile_type ?? null}
    />
  );
}
