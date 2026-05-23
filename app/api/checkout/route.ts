import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!stripeSecret || !priceId) {
    console.error("checkout route: missing STRIPE_SECRET_KEY or STRIPE_PRICE_ID");
    return NextResponse.json(
      { error: "Server not configured." },
      { status: 500 }
    );
  }

  const origin =
    req.headers.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_ORIGIN ||
    "https://signdayapp.com";

  // Optional referral code captured from a ?ref= link on the site.
  let referredBy = "";
  try {
    const body = await req.json();
    if (typeof body?.ref === "string") referredBy = body.ref.trim().slice(0, 32);
  } catch {
    /* no body is fine */
  }

  const stripe = new Stripe(stripeSecret);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      // session.metadata is readable in the checkout.session.completed webhook.
      metadata: { referred_by: referredBy },
      subscription_data: {
        metadata: {
          source: "signdayapp.com",
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("checkout error:", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 }
    );
  }
}
