import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export const STRIPE_PLANS = {
  pro: {
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    name: "Pro",
    price: 9,
  },
  ecurie: {
    priceId: process.env.STRIPE_ECURIE_PRICE_ID!,
    name: "Écurie",
    price: 29,
  },
} as const;
