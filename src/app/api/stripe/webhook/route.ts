import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe, STRIPE_PLANS } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

export const runtime = "nodejs";

function getPlanFromPriceId(priceId: string): "pro" | "ecurie" | null {
  if (priceId === STRIPE_PLANS.pro.priceId) return "pro";
  if (priceId === STRIPE_PLANS.ecurie.priceId) return "ecurie";
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = headers().get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  try {
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const priceId = subscription.items.data[0]?.price?.id;
      const plan = getPlanFromPriceId(priceId);

      if (subscription.status === "active" || subscription.status === "trialing") {
        await adminClient
          .from("users")
          .update({
            plan: plan || "starter",
            subscription_status: "active",
            stripe_subscription_id: subscription.id,
          })
          .eq("stripe_customer_id", customerId);
      } else if (subscription.status === "past_due" || subscription.status === "unpaid") {
        await adminClient
          .from("users")
          .update({ subscription_status: "past_due" })
          .eq("stripe_customer_id", customerId);
      } else if (subscription.status === "canceled") {
        await adminClient
          .from("users")
          .update({
            plan: "starter",
            subscription_status: "inactive",
            stripe_subscription_id: null,
          })
          .eq("stripe_customer_id", customerId);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      await adminClient
        .from("users")
        .update({
          plan: "starter",
          subscription_status: "inactive",
          stripe_subscription_id: null,
        })
        .eq("stripe_customer_id", customerId);
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
