import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { mintAccessToken } from "@/lib/accessToken";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Emails a customer a secure, time-limited link to manage their account
// (billing + update athlete/schools). Anti-enumeration: always responds ok,
// only actually sends if the email belongs to a customer.
export async function POST(req: Request) {
  // Sending email: keep this tight.
  const rl = await rateLimit(req, "request-link", 5, 3600);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a few minutes." },
      { status: 429 }
    );
  }

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromAddress =
    process.env.WAITLIST_FROM_EMAIL || "Tony <tony@signdayapp.com>";

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  const okResponse = NextResponse.json({ ok: true });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  // Only send if they're a real customer. Always return ok either way.
  if (!customer) return okResponse;

  const token = mintAccessToken(email, 24 * 3600); // 24 hours
  if (!token || !resendApiKey) return okResponse; // tokens/email not configured

  const origin =
    req.headers.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_ORIGIN ||
    "https://www.signdayapp.com";
  const link = `${origin}/account?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

  try {
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: "Your SignDay account link",
      text: `Hi,

Here's your secure link to manage your SignDay account (cancel or update billing, or edit your athlete and school list):

${link}

This link works for 24 hours and only for this email address. If you didn't request it, you can ignore this.

Tony
`,
    });
  } catch (e) {
    console.error("request-link send error:", e);
  }

  return okResponse;
}
