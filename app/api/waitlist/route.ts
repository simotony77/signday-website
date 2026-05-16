import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.WAITLIST_FROM_EMAIL || "Tony <tony@signdayapp.com>";
  const notifyAddress = process.env.WAITLIST_NOTIFY_EMAIL || "tony@signdayapp.com";

  if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
    console.error("waitlist route: missing required env vars");
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }

  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    const userAgent = req.headers.get("user-agent") || null;
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error: insertError } = await supabase
      .from("waitlist_signups")
      .insert({ email, user_agent: userAgent, ip, source: "signdayapp.com" });

    if (insertError && insertError.code !== "23505") {
      console.error("waitlist insert error:", insertError);
      return NextResponse.json(
        { error: "Could not save signup. Please try again." },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);

    try {
      await resend.emails.send({
        from: fromAddress,
        to: email,
        subject: "You're on the SignDay waitlist. Quick favor",
        text: buildAutoReplyText(),
      });
    } catch (emailErr) {
      console.error("resend send error (auto-reply):", emailErr);
    }

    // Notify Tony of every new signup
    try {
      await resend.emails.send({
        from: fromAddress,
        to: notifyAddress,
        subject: `🎯 New SignDay signup: ${email}`,
        text: `New waitlist signup on signdayapp.com

Email:       ${email}
Time:        ${new Date().toISOString()}
Source:      ${req.headers.get("referer") || "signdayapp.com"}
User-Agent:  ${userAgent || "(unknown)"}
IP:          ${ip || "(unknown)"}

Next step: watch for their reply to the auto-reply with grad year / position / biggest headache. If they don't reply within 48h, send a personal follow-up.

See all signups: https://supabase.com/dashboard/project/teamquykkznndcmknvpy/editor
`,
      });
    } catch (notifyErr) {
      console.error("resend send error (notify):", notifyErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("waitlist route error:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

function buildAutoReplyText() {
  return `Hey,

Thanks for joining the SignDay waitlist. I'm Tony, a soccer dad in the middle of my own daughter's D3 recruiting, building this for the work I couldn't keep up with.

Quick favor. Reply to this email with three things so I can build for your situation specifically:

1) What grad year is your athlete?
2) What position?
3) What's the biggest headache in your daughter's recruiting right now?

Doesn't have to be polished. One line each is plenty.

I read every reply personally. Will get back to you within 24h.

Tony
`;
}
