import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { analysisId } = await request.json();
    if (!analysisId) return NextResponse.json({ error: "analysisId required" }, { status: 400 });

    const { data: analysis } = await supabase
      .from("video_analyses")
      .select("id, share_token")
      .eq("id", analysisId)
      .eq("user_id", user.id)
      .single();

    if (!analysis) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let token = analysis.share_token;
    if (!token) {
      token = crypto.randomUUID();
      await supabase.from("video_analyses").update({ share_token: token }).eq("id", analysisId);
    }

    const origin = request.nextUrl.origin;
    const shareUrl = `${origin}/share/analyse/${token}`;
    return NextResponse.json({ shareUrl, token });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
