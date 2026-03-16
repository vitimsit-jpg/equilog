import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, STRIPE_PLANS } from "@/lib/stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://equilog-i3nr-vitimsit-jpgs-projects.vercel.app";

export async function GET(req: NextRequest) {
  const plan = req.nextUrl.searchParams.get("plan") as "pro" | "ecurie" | null;

  if (!plan || !STRIPE_PLANS[plan]) {
    return NextResponse.redirect(`${APP_URL}/pricing`);
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${APP_URL}/register?plan=${plan}`);
  }

  const adminClient = createAdminClient();
  const { data: userProfile } = await adminClient
    .from("users")
    .select("stripe_customer_id, email, name")
    .eq("id", user.id)
    .single();

  let customerId = userProfile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userProfile?.email || user.email,
      name: userProfile?.name || undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await adminClient.from("users").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: STRIPE_PLANS[plan].priceId, quantity: 1 }],
    success_url: `${APP_URL}/settings?success=1`,
    cancel_url: `${APP_URL}/pricing`,
    metadata: { user_id: user.id, plan },
  });

  return NextResponse.redirect(session.url!);
}
