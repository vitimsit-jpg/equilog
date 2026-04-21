import { NextResponse } from "next/server";

// AUDIT CRIT-2 — Endpoint désactivé en production (fuite d'information)
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
  });
}
