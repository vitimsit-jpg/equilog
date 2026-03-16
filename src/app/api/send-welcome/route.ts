import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json();
    if (!email || !name) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    await sendWelcomeEmail({ to: email, userName: name });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("send-welcome error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
