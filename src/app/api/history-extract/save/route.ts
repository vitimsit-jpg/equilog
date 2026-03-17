import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { horseId, events } = await req.json();

    if (!horseId || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: horse } = await adminClient
      .from("horses")
      .select("id")
      .eq("id", horseId)
      .eq("user_id", user.id)
      .single();

    if (!horse) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const rows = events.map((ev: Record<string, unknown>) => ({
      horse_id: horseId,
      category: ev.category || "autre",
      title: ev.title || null,
      description: ev.description || null,
      date_precision: ev.date_precision || "inconnue",
      event_date: ev.event_date || null,
      event_month: ev.event_month || null,
      event_year: ev.event_year || null,
      vet_name: ev.vet_name || null,
      clinic: ev.clinic || null,
      outcome: ev.outcome || null,
      severity: ev.severity || null,
      extracted_by_ai: true,
      ai_confidence: ev.confidence || null,
      notes: null,
    }));

    const { error } = await adminClient.from("horse_history_events").insert(rows);

    if (error) {
      console.error("Save history events error:", error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    return NextResponse.json({ saved: rows.length });
  } catch (err) {
    console.error("Save history events error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
