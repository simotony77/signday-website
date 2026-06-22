import { NextResponse } from "next/server";
import { Resend } from "resend";
import { rateLimit } from "@/lib/rateLimit";
import { saveDemoLead } from "@/lib/demoLog";
import {
  demoSigningEnabled,
  verifyDemoLead,
  type DemoLeadPayload,
} from "@/lib/demoSign";
import { gmailComposeUrl } from "@/lib/gmailCompose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LeadRequest {
  email: string;
  first_name?: string;
  source?: string;
  lead_payload?: DemoLeadPayload;
  lead_sig?: string;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Build the rich email a prospect gets when they ask the demo to send them the
// full breakdown they just saw. Mirrors the 4 steps of the on-page demo so the
// prospect has the whole experience in their inbox to revisit + share.
function buildLeadEmail(
  lead: LeadRequest,
  origin: string
): { subject: string; text: string; html: string } {
  const p = lead.lead_payload as DemoLeadPayload;
  const who = lead.first_name?.trim() || "your athlete";
  const school = p.school_name?.trim() || "that program";
  const subject = `SignDay: what the agent would do for ${who} at ${school}`;

  const seniors = p.graduating_seniors || [];
  const results = p.recent_results || [];

  // ---- TEXT ----
  const t: string[] = [];
  t.push(`Hi,`);
  t.push(``);
  t.push(`Here's the full breakdown of what the SignDay agent would do for ${who} at ${school}.`);
  t.push(``);
  t.push(`---- WHAT I'D WATCH EVERY SUNDAY ----`);
  if (p.head_coach) t.push(`Head coach: ${p.head_coach}`);
  if (p.record) t.push(`Record: ${p.record}`);
  if (seniors.length > 0) {
    t.push(`Graduating seniors (roster spots opening):`);
    for (const s of seniors) t.push(`  - ${s.name} (${s.position}, ${s.class_year})`);
  }
  if (results.length > 0) {
    t.push(`Recent results:`);
    for (const r of results)
      t.push(`  - ${r.result || ""} vs ${r.opponent}${r.date ? ` (${r.date})` : ""}`);
  }
  t.push(``);
  t.push(`---- WHAT I FLAGGED THIS WEEK ----`);
  t.push(p.trigger);
  t.push(``);
  t.push(`---- DRAFT READY FOR ${who.toUpperCase()} ----`);
  t.push(`Subject: ${p.subject}`);
  t.push(``);
  t.push(p.body);
  t.push(``);
  t.push(`Open in Gmail: ${gmailComposeUrl({ subject: p.subject, body: p.body })}`);
  t.push(``);
  t.push(`---- ONE EMAIL, EVERY SUNDAY ----`);
  t.push(`Multiply this by every school on your athlete's list. SignDay watches them all, every week, and your Sunday digest pulls together the drafts that are ready. You approve and send from your athlete's Gmail.`);
  t.push(``);
  t.push(`$39/month, cancel anytime. Start here: ${origin}/?utm_source=demo_email`);
  t.push(``);
  t.push(`Tony @ SignDay`);

  // ---- HTML ----
  const gmailHref = gmailComposeUrl({ subject: p.subject, body: p.body }).replace(/&/g, "&amp;");
  const sectionTitle = `margin-top:28px; font-size:13px; font-weight:700; color:#6B7280; letter-spacing:0.08em; text-transform:uppercase;`;

  const seniorsHtml = seniors.length
    ? `<ul style="line-height:1.65; padding-left:20px; color:#374151; margin-top:6px;">${seniors
        .map(
          (s) =>
            `<li>${escapeHtml(s.name)} <span style="color:#9CA3AF;">(${escapeHtml(s.position)}, ${escapeHtml(s.class_year)})</span></li>`
        )
        .join("")}</ul>`
    : "";

  const resultsHtml = results.length
    ? `<ul style="line-height:1.65; padding-left:20px; color:#374151; margin-top:6px; list-style:none;">${results
        .map((r) => {
          const color = r.is_win
            ? "#065F46"
            : (r.result || "").trim().startsWith("L")
            ? "#991B1B"
            : "#92400E";
          return `<li><span style="display:inline-block; min-width:54px; font-weight:600; color:${color};">${escapeHtml(r.result || "")}</span> vs ${escapeHtml(r.opponent)}${r.date ? `<span style="color:#9CA3AF;"> · ${escapeHtml(r.date)}</span>` : ""}</li>`;
        })
        .join("")}</ul>`
    : "";

  const h: string[] = [];
  h.push(`<div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #111827;">`);
  h.push(`<div style="font-size:12px; color:#1A56DB; font-weight:700; letter-spacing:0.12em; text-transform:uppercase;">SignDay agent</div>`);
  h.push(`<h2 style="margin: 4px 0 8px; font-size:22px; line-height:1.3;">What the agent would do for ${escapeHtml(who)} at ${escapeHtml(school)}</h2>`);
  h.push(`<p style="color:#6B7280; font-size:14px; margin:0 0 8px;">The full 4-step breakdown you just saw, ready to revisit anytime.</p>`);

  // 1. Monitoring
  h.push(`<div style="${sectionTitle}">1 · What I'd watch every Sunday</div>`);
  if (p.head_coach || p.record) {
    const parts: string[] = [];
    if (p.head_coach) parts.push(`<b>Head coach:</b> ${escapeHtml(p.head_coach)}`);
    if (p.record) parts.push(`<b>Record:</b> ${escapeHtml(p.record)}`);
    h.push(`<p style="line-height:1.6; color:#374151; margin:6px 0 0;">${parts.join(" &middot; ")}</p>`);
  }
  if (seniors.length > 0) {
    h.push(`<div style="font-size:13px; color:#374151; margin-top:14px;"><b>Graduating seniors</b> <span style="color:#9CA3AF;">(spots opening next cycle)</span></div>`);
    h.push(seniorsHtml);
  }
  if (results.length > 0) {
    h.push(`<div style="font-size:13px; color:#374151; margin-top:14px;"><b>Recent results</b></div>`);
    h.push(resultsHtml);
  }

  // 2. Trigger
  h.push(`<div style="${sectionTitle}">2 · What I flagged this week</div>`);
  h.push(`<div style="margin-top:8px; padding:12px 14px; background:#FFFBEB; border-left:3px solid #F59E0B; color:#92400E; font-size:14px; line-height:1.55; border-radius:6px;">${escapeHtml(p.trigger)}</div>`);

  // 3. Draft
  h.push(`<div style="${sectionTitle}">3 · Draft ready for ${escapeHtml(who)}</div>`);
  h.push(`<div style="margin-top:8px; padding:16px; border:1px solid #E5E7EB; background:#F9FAFB; border-radius:8px;">`);
  h.push(`<div style="font-weight:600; color:#111827; font-size:14px;">${escapeHtml(p.subject)}</div>`);
  h.push(`<pre style="font-family: ui-monospace, Menlo, monospace; font-size:13px; white-space:pre-wrap; margin:12px 0 0; padding:12px; background:#fff; border:1px solid #E5E7EB; border-radius:6px;">${escapeHtml(p.body)}</pre>`);
  h.push(`<a href="${gmailHref}" style="display:inline-block; margin-top:14px; background:#1A56DB; color:#fff; text-decoration:none; font-weight:600; font-size:13px; padding:9px 16px; border-radius:8px;">Open in Gmail to edit &amp; send</a>`);
  h.push(`</div>`);

  // 4. Delivery + CTA
  h.push(`<div style="${sectionTitle}">4 · One email, every Sunday</div>`);
  h.push(`<p style="line-height:1.65; color:#374151; margin-top:8px;">Multiply this by every school on your athlete's list. SignDay watches them all, every week, and your Sunday digest pulls together the drafts that are ready. You approve and send from your athlete's Gmail.</p>`);
  h.push(`<div style="margin-top:18px; padding:18px; background:#F9FAFB; border:1px solid #E5E7EB; border-radius:10px; text-align:center;">`);
  h.push(`<div style="font-weight:700; font-size:16px; color:#111827;">Want this for ${escapeHtml(who)}'s whole list?</div>`);
  h.push(`<div style="color:#6B7280; font-size:13px; margin-top:4px;">$39/month · cancel anytime, one click · no contract</div>`);
  h.push(`<a href="${escapeHtml(origin)}/?utm_source=demo_email" style="display:inline-block; margin-top:14px; background:#1A56DB; color:#fff; text-decoration:none; font-weight:600; font-size:14px; padding:11px 22px; border-radius:8px;">Get SignDay</a>`);
  h.push(`</div>`);

  h.push(`<p style="color:#9CA3AF; font-size:12px; margin-top:28px; line-height:1.5;">Tony @ SignDay &middot; You're getting this because you asked the demo at signdayapp.com to email you the breakdown. If this wasn't you, just delete it.</p>`);
  h.push(`</div>`);

  return { subject, text: t.join("\n"), html: h.join("\n") };
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

  const p = body.lead_payload;
  if (!p || !p.subject?.trim() || !p.body?.trim() || !p.school_name?.trim()) {
    return NextResponse.json({ error: "Missing demo data. Re-run the demo and try again." }, { status: 400 });
  }
  // Cap sizes so a crafted payload can't turn this into a spam relay.
  if (p.subject.length > 300 || p.body.length > 8000 || p.trigger.length > 2000) {
    return NextResponse.json({ error: "Payload too long." }, { status: 400 });
  }

  // Anti-relay: the full lead payload is HMAC-signed server-side. Without a
  // valid signature we refuse to email; this endpoint can't be used to push
  // arbitrary content from our domain.
  if (demoSigningEnabled() && !verifyDemoLead(p, body.lead_sig || "")) {
    return NextResponse.json(
      { error: "This demo result couldn't be verified. Re-run the demo and try again." },
      { status: 400 }
    );
  }

  // Save the warm lead first (best-effort), then send the email.
  await saveDemoLead({
    email,
    first_name: body.first_name,
    school_name: p.school_name,
    source: body.source,
  });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
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
