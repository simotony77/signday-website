import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { mintAccessToken } from "@/lib/accessToken";
import { generateReferralCode, referralLink } from "@/lib/referral";

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

        const referredBy =
          (session.metadata?.referred_by || "").trim() || null;

        // Resolve a stable referral code: reuse the existing one if this
        // customer already has it (Stripe can retry events), else generate.
        const { data: existing } = await supabase
          .from("customers")
          .select("referral_code")
          .eq("stripe_customer_id", stripeCustomerId)
          .maybeSingle();
        const referralCode =
          existing?.referral_code || generateReferralCode();

        // Upsert customer row
        const { error: insertError } = await supabase
          .from("customers")
          .upsert(
            {
              email,
              stripe_customer_id: stripeCustomerId,
              stripe_subscription_id: stripeSubscriptionId,
              subscription_status: "active",
              referral_code: referralCode,
              referred_by: referredBy,
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
            process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://www.signdayapp.com";
          // 30-day signed token gives them time to onboard and manage their
          // account from these emailed links without re-verifying.
          const accessToken = mintAccessToken(email, 30 * 24 * 3600);
          const tokenParam = accessToken
            ? `&token=${encodeURIComponent(accessToken)}`
            : "";
          const onboardingUrl = `${origin}/onboarding?email=${encodeURIComponent(email)}${tokenParam}`;
          const accountUrl = `${origin}/account?email=${encodeURIComponent(email)}${tokenParam}`;
          const refLink = referralLink(origin, referralCode);

          try {
            await resend.emails.send({
              from: fromAddress,
              to: email,
              subject: "Welcome to SignDay. One more step.",
              text: `Hi,

Welcome to SignDay. Your $39/month subscription is active.

To get your first weekly digest this Sunday, I need to know about your athlete and the schools you're tracking. Takes about 3 minutes.

Onboarding form:
${onboardingUrl}

Reply to this email if anything goes sideways. I read every reply personally.

Manage your subscription, or update your school list any time:
${accountUrl}
(cancel / update payment / view invoices, or add / remove schools)

Know another family drowning in recruiting? Send them your link:
${refLink}
When they subscribe, you both get your next month free.

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
Referral code:   ${referralCode}
${referredBy ? `Referred by:     ${referredBy}  >>> ACTION: comp BOTH this customer and the referrer a free month in Stripe.` : "Referred by:     (organic, not a referral)"}

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
