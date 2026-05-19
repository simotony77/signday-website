import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromAddress =
    process.env.WAITLIST_FROM_EMAIL || "Tony <tony@signdayapp.com>";
  const notifyAddress =
    process.env.WAITLIST_NOTIFY_EMAIL || "tony@signdayapp.com";

  if (!stripeSecret || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
    console.error("stripe-webhook: missing required env vars");
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await req.text();

  const stripe = new Stripe(stripeSecret);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("stripe-webhook: signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // We handle a few subscription-lifecycle events. Most important is
  // checkout.session.completed (initial signup).
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const email = session.customer_details?.email || session.customer_email || "";
        const stripeCustomerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id || "";
        const stripeSubscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id || null;

        if (!email || !stripeCustomerId) {
          console.error("stripe-webhook: missing email or customer id on session");
          break;
        }

        // Upsert customer row
        const onboardingToken = randomUUID();
        const { error: insertError } = await supabase
          .from("customers")
          .upsert(
            {
              email,
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: stripeSubscriptionId,
              subscription_status: "active",
            },
            { onConflict: "stripe_customer_id" }
          );
        if (insertError) {
          console.error("stripe-webhook: supabase upsert error", insertError);
        }

        // Send onboarding email to customer + notification to Tony
        if (resendApiKey) {
          const resend = new Resend(resendApiKey);
          const origin =
            process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://signdayapp.com";
          const onboardingUrl = `${origin}/onboarding?email=${encodeURIComponent(email)}&token=${onboardingToken}`;

          try {
            await resend.emails.send({
              from: fromAddress,
              to: email,
              subject: "Welcome to SignDay. One more step.",
              text: `Hi,

Welcome to SignDay. Your $99/month subscription is active.

To get your first weekly digest this Sunday, I need to know about your athlete and the schools you're tracking. Takes about 3 minutes.

Onboarding form:
${onboardingUrl}

Reply to this email if anything goes sideways. I read every reply personally.

Manage your subscription, or update your school list any time:
${origin}/account
(cancel / update payment / view invoices, or add / remove schools)

Tony
`,
            });
          } catch (e) {
            console.error("stripe-webhook: customer email send error", e);
          }

          try {
            await resend.emails.send({
              from: fromAddress,
              to: notifyAddress,
              subject: `New SignDay customer: ${email}`,
              text: `New SignDay subscription.

Email:           ${email}
Stripe customer: ${stripeCustomerId}
Subscription:    ${stripeSubscriptionId}
Time:            ${new Date().toISOString()}

Onboarding link sent to customer:
${onboardingUrl}

Once they submit the onboarding form, you'll get another notification with their athlete + schools.
`,
            });
          } catch (e) {
            console.error("stripe-webhook: notify send error", e);
          }
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const status =
          event.type === "customer.subscription.deleted" ? "cancelled" : sub.status;
        const stripeCustomerId =
          typeof sub.customer === "string" ? sub.customer : sub.customer.id;

        const { error: updateError } = await supabase
          .from("customers")
          .update({ subscription_status: status })
          .eq("stripe_customer_id", stripeCustomerId);
        if (updateError) {
          console.error("stripe-webhook: status update error", updateError);
        }
        break;
      }

      default:
        // Ignore other event types
        break;
    }
  } catch (err) {
    console.error("stripe-webhook handler error:", err);
    return NextResponse.json({ error: "Handler error." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
