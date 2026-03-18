import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendOwnerNotification } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { horseId, message, ownerName } = await req.json();
    if (!horseId || !message) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const { data: horse } = await supabase.from("horses").select("name, owner_email, owner_name").eq("id", horseId).single();
    if (!horse?.owner_email) return NextResponse.json({ error: "No owner email" }, { status: 400 });

    const { data: gerant } = await supabase.from("users").select("name").eq("id", user.id).single();

    await sendOwnerNotification({
      to: horse.owner_email,
      ownerName: ownerName || horse.owner_name || "Propriétaire",
      horseName: horse.name,
      gerantName: gerant?.name || "Le gérant",
      message,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("notify-owner error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
