import { NextResponse } from "next/server";
import { Resend } from "resend";
import { rateLimit } from "@/lib/rateLimit";
import { saveDemoLead } from "@/lib/demoLog";
import { demoSigningEnabled, verifyDemoDraft } from "@/lib/demoSign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LeadRequest {
  email: string;
  first_name?: string;
  school_name?: string;
  subject: string;
  body: string;
  draft_sig?: string;
  trigger?: string;
  source?: string;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Build the email a prospect gets when they ask the demo to send them their
// draft. Transactional (they requested it): their own draft, plus an honest
// nudge that the product does this for their whole list every week.
function buildLeadEmail(
  lead: LeadRequest,
  origin: string
): { subject: string; text: string; html: string } {
  const who = lead.first_name?.trim() || "your athlete";
  const school = lead.school_name?.trim() || "that program";
  const subject = `Your SignDay draft for ${who} → ${school}`;

  const text = [
    `Hi,`,
    ``,
    `Here's the coach outreach email SignDay drafted for ${who} at ${school}.`,
    lead.trigger ? `\nWhy now: ${lead.trigger}` : ``,
    ``,
    `----`,
    `Subject: ${lead.subject}`,
    ``,
    lead.body,
    `----`,
    ``,
    `That's one school, one week. SignDay watches your whole target list every`,
    `Sunday, catches the moment a roster or coaching change opens a door, and`,
    `drafts an email like this for each one. You approve and send from your`,
    `athlete's Gmail. $99/month, cancel anytime.`,
    ``,
    `Start here: ${origin}`,
    ``,
    `Tony @ SignDay`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  const html = `<div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #111827;">
    <p style="line-height:1.6;">Here's the coach outreach email SignDay drafted for <b>${escapeHtml(who)}</b> at <b>${escapeHtml(school)}</b>.</p>
    ${lead.trigger ? `<p style="font-size:13px;color:#6B7280;line-height:1.5;">Why now: ${escapeHtml(lead.trigger)}</p>` : ""}
    <div style="margin:16px 0; padding:16px; border-left:3px solid #1A56DB; background:#F9FAFB;">
      <div style="font-weight:600;color:#111827;">${escapeHtml(lead.subject)}</div>
      <pre style="font-family: ui-monospace, Menlo, monospace; font-size: 13px; white-space: pre-wrap; margin-top: 12px; padding: 12px; background:#fff; border:1px solid #E5E7EB; border-radius: 6px;">${escapeHtml(lead.body)}</pre>
    </div>
    <p style="line-height:1.6; color:#374151;">That's one school, one week. SignDay watches your whole target list every Sunday, catches the moment a roster or coaching change opens a door, and drafts an email like this for each one. You approve and send from your athlete's Gmail. $99/month, cancel anytime.</p>
    <p style="margin-top:20px;"><a href="${escapeHtml(origin)}" style="background:#1A56DB;color:#fff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:8px;display:inline-block;">See SignDay</a></p>
    <p style="color:#9CA3AF; font-size: 12px; margin-top: 24px;">Tony @ SignDay &middot; You're getting this because you asked the demo at signdayapp.com to send you your draft.</p>
  </div>`;

  return { subject, text, html };
}

export async function POST(req: Request) {
  // Tighter than the demo run itself: this sends an email, so blunt abuse hard.
  const rl = await rateLimit(req, "demo-lead", 5, 3600);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Give it a few minutes." },
      { status: 429 }
    );
  }

  let body: LeadRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = (body.email || "").trim();
  if (!EMAIL_RE.test(email) || email.length > 200) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  if (!body.subject?.trim() || !body.body?.trim()) {
    return NextResponse.json({ error: "Missing draft to send." }, { status: 400 });
  }
  // Cap sizes so a crafted payload can't turn this into a spam relay.
  if (body.subject.length > 300 || body.body.length > 6000) {
    return NextResponse.json({ error: "Draft too long." }, { status: 400 });
  }

  // Anti-relay: only email content SignDay actually generated. Each demo draft
  // is HMAC-signed server-side; without a valid signature we refuse to send, so
  // this endpoint can't be used to push arbitrary content from our domain.
  if (
    demoSigningEnabled() &&
    !verifyDemoDraft(body.subject, body.body, body.school_name || "", body.draft_sig || "")
  ) {
    return NextResponse.json(
      { error: "This draft couldn't be verified. Re-run the demo and try again." },
      { status: 400 }
    );
  }

  // Save the warm lead first (best-effort), then send the email.
  await saveDemoLead({
    email,
    first_name: body.first_name,
    school_name: body.school_name,
    source: body.source,
  });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    // Lead is saved; we just can't email right now. Don't hard-fail the UX.
    return NextResponse.json({ ok: true, emailed: false });
  }

  const fromEmail =
    process.env.DIGEST_FROM_EMAIL || "Tony <tony@signdayapp.com>";
  const origin =
    process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://www.signdayapp.com";
  const mail = buildLeadEmail(body, origin);

  try {
    const resend = new Resend(resendKey);
    const result = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    if (result.error) {
      console.error("demo-lead send failed:", result.error);
      return NextResponse.json(
        { error: "Couldn't send the email. Try again in a minute." },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, emailed: true });
  } catch (err) {
    console.error("demo-lead error:", err);
    return NextResponse.json(
      { error: "Couldn't send the email. Try again in a minute." },
      { status: 500 }
    );
  }
}
