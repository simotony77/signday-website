import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { verifyAccessToken, accessTokensEnabled } from "@/lib/accessToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeSecret || !supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }

  let body: { email?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  // Require a valid emailed token to prove ownership of this email (gates
  // billing actions). Degrades gracefully if token gating isn't configured yet.
  if (accessTokensEnabled()) {
    const token = typeof body.token === "string" ? body.token : "";
    if (!verifyAccessToken(email, token)) {
      return NextResponse.json(
        { error: "This link is invalid or expired. Request a fresh link from the account page." },
        { status: 401 }
      );
    }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: customer } = await supabase
    .from("customers")
    .select("stripe_customer_id")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!customer?.stripe_customer_id) {
    return NextResponse.json(
      {
        error:
          "No subscription found for that email. If you just signed up, give it a minute and try again. Otherwise email tony@signdayapp.com.",
      },
      { status: 404 }
    );
  }

  const stripe = new Stripe(stripeSecret);
  const origin =
    req.headers.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_ORIGIN ||
    "https://www.signdayapp.com";

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: `${origin}/account?ok=1`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("billing-portal session error:", err);
    return NextResponse.json(
      {
        error:
          "Could not open billing portal. The portal may not be enabled in Stripe yet. Email tony@signdayapp.com to cancel manually.",
      },
      { status: 500 }
    );
  }
}
