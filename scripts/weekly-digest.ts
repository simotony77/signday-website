/**
 * SignDay weekly digest orchestrator.
 *
 * Runs every Sunday (via GitHub Actions). For every active, onboarded
 * customer it scrapes their tracked schools, diffs against last week,
 * drafts coach emails for any changes, and sends their personalized digest.
 *
 * Usage:
 *   npm run agent:weekly                 # all active customers, sends emails
 *   npm run agent:weekly -- --email x@y  # one customer only
 *   npm run agent:weekly -- --dry-run    # build digests but DON'T send
 *
 * Required env:
 *   ANTHROPIC_API_KEY
 *   RESEND_API_KEY
 *   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   DIGEST_FROM_EMAIL (defaults to "Tony <tony@signdayapp.com>")
 *   CLAUDE_MODEL (optional, defaults to claude-sonnet-4-5)
 */

import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import {
  runForCustomer,
  toAthleteProfile,
  type CustomerRunResult,
} from "../lib/agent/run";
import type { TrackedSchool } from "../lib/agent/types";

function log(...args: unknown[]) {
  // stderr is unbuffered on Windows; keeps logs visible during local runs.
  console.error(...args);
}

// Per-customer outcome of one weekly run, used to build the founder summary.
interface Outcome {
  email: string;
  ok: boolean;
  error?: string; // set when the whole customer run threw
  result?: CustomerRunResult;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Build the founder ops summary: one glance tells Tony if the run was healthy.
// Surfaces total drafts, schools skipped for bad scrapes, held digests, and
// any customer whose run threw — exactly the signals that would have caught the
// Brown blow-up on day one instead of by accident.
function buildOpsSummary(
  outcomes: Outcome[],
  dryRun: boolean
): { subject: string; text: string; html: string } {
  const oks = outcomes.filter((o) => o.ok && o.result);
  const errored = outcomes.filter((o) => !o.ok);

  const totalDrafts = oks.reduce((n, o) => n + (o.result!.drafts_count || 0), 0);
  const totalTriggers = oks.reduce(
    (n, o) => n + (o.result!.triggers_count || 0),
    0
  );
  const totalSkips = oks.reduce((n, o) => n + (o.result!.failures || 0), 0);
  const sentCount = oks.filter((o) => o.result!.sent).length;
  const heldCount = oks.filter((o) => o.result!.held).length;
  const baselineCount = oks.filter((o) => o.result!.is_baseline).length;

  const needsAttention = heldCount > 0 || errored.length > 0;
  const subject = needsAttention
    ? `[ATTN] SignDay run: ${heldCount} held, ${errored.length} errored, ${totalSkips} skips${dryRun ? " [dry]" : ""}`
    : `SignDay run: ${sentCount} sent, ${totalDrafts} drafts, ${totalSkips} skips${dryRun ? " [dry]" : ""}`;

  // ---- text ----
  const t: string[] = [];
  t.push(`SignDay weekly run — ${new Date().toISOString()}${dryRun ? " [DRY RUN]" : ""}`);
  t.push("");
  t.push(`Customers processed: ${outcomes.length}`);
  t.push(`  sent: ${sentCount}   held: ${heldCount}   baseline: ${baselineCount}   errored: ${errored.length}`);
  t.push(`Drafts generated: ${totalDrafts}   triggers: ${totalTriggers}   schools skipped: ${totalSkips}`);

  const heldList = oks.filter((o) => o.result!.held);
  if (heldList.length > 0) {
    t.push("");
    t.push("HELD for review (not sent — abnormal draft volume):");
    for (const o of heldList) {
      t.push(`  - ${o.email}: ${o.result!.drafts_count} drafts`);
    }
  }

  if (errored.length > 0) {
    t.push("");
    t.push("ERRORED (whole customer run threw):");
    for (const o of errored) t.push(`  - ${o.email}: ${o.error}`);
  }

  const skipLines: string[] = [];
  for (const o of oks) {
    for (const f of o.result!.failure_details) {
      skipLines.push(`  - ${o.email} | ${f.school}: ${f.error}`);
    }
  }
  if (skipLines.length > 0) {
    t.push("");
    t.push("Schools skipped this run (bad/partial scrape — will retry next week):");
    t.push(...skipLines);
  }

  if (!needsAttention && skipLines.length === 0) {
    t.push("");
    t.push("All clean. Nothing needs your attention.");
  }

  // ---- html (compact, monospace-ish) ----
  const h: string[] = [];
  h.push(
    `<div style="font-family: ui-monospace, Menlo, monospace; font-size: 13px; color:#111827; max-width:680px;">`
  );
  h.push(
    `<div style="font-weight:700; font-size:15px; ${needsAttention ? "color:#B45309;" : ""}">${esc(subject)}</div>`
  );
  h.push(
    `<p>Customers: <b>${outcomes.length}</b> &middot; sent <b>${sentCount}</b> &middot; held <b>${heldCount}</b> &middot; baseline <b>${baselineCount}</b> &middot; errored <b>${errored.length}</b></p>`
  );
  h.push(
    `<p>Drafts <b>${totalDrafts}</b> &middot; triggers <b>${totalTriggers}</b> &middot; schools skipped <b>${totalSkips}</b></p>`
  );
  if (heldList.length > 0) {
    h.push(`<p style="color:#B45309;"><b>HELD for review (not sent):</b></p><ul>`);
    for (const o of heldList)
      h.push(`<li>${esc(o.email)}: ${o.result!.drafts_count} drafts</li>`);
    h.push(`</ul>`);
  }
  if (errored.length > 0) {
    h.push(`<p style="color:#B91C1C;"><b>ERRORED:</b></p><ul>`);
    for (const o of errored) h.push(`<li>${esc(o.email)}: ${esc(o.error || "")}</li>`);
    h.push(`</ul>`);
  }
  if (skipLines.length > 0) {
    h.push(`<p><b>Schools skipped (will retry):</b></p><ul>`);
    for (const o of oks)
      for (const f of o.result!.failure_details)
        h.push(`<li>${esc(o.email)} | ${esc(f.school)}: ${esc(f.error)}</li>`);
    h.push(`</ul>`);
  }
  if (!needsAttention && skipLines.length === 0) {
    h.push(`<p style="color:#047857;">All clean. Nothing needs your attention.</p>`);
  }
  h.push(`</div>`);

  return { subject, text: t.join("\n"), html: h.join("\n") };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const emailIdx = args.indexOf("--email");
  const onlyEmail =
    emailIdx >= 0 && args[emailIdx + 1]
      ? args[emailIdx + 1].trim().toLowerCase()
      : null;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const fromEmail =
    process.env.DIGEST_FROM_EMAIL || "Tony <tony@signdayapp.com>";
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-5";
  // Where the founder ops summary goes, and the circuit-breaker threshold.
  const opsEmail = process.env.OPS_EMAIL || "tony@signdayapp.com";
  const maxDraftsBeforeHold = Number(process.env.MAX_DRAFTS_PER_CUSTOMER) || 5;

  if (!anthropicKey || !supabaseUrl || !supabaseServiceKey) {
    log(
      "[FATAL] Missing env: need ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
    );
    process.exit(1);
  }
  if (!resendKey && !dryRun) {
    log("[FATAL] Missing RESEND_API_KEY (or pass --dry-run to skip sending)");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const anthropic = new Anthropic({ apiKey: anthropicKey });
  const resend = dryRun || !resendKey ? null : new Resend(resendKey);

  // Active + onboarded customers.
  let query = supabase
    .from("customers")
    .select("id, email, subscription_status, onboarded_at, referral_code")
    .eq("subscription_status", "active");
  if (onlyEmail) query = query.eq("email", onlyEmail);

  const { data: customers, error } = await query;
  if (error) {
    log("[FATAL] Could not load customers:", error.message);
    process.exit(1);
  }
  if (!customers || customers.length === 0) {
    log("No active customers to process. Done.");
    return;
  }

  log(
    `\n=== SignDay weekly digest ${new Date().toISOString()} ===\n` +
      `${customers.length} active customer(s)${dryRun ? " [DRY RUN]" : ""}\n`
  );

  let processed = 0;
  let sent = 0;
  const outcomes: Outcome[] = [];

  for (const c of customers) {
    // Pull their latest onboarding submission (athlete + schools).
    const { data: submission } = await supabase
      .from("onboarding_submissions")
      .select("athlete, schools")
      .eq("email", c.email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!submission) {
      log(`- ${c.email}: no onboarding submission yet, skipping.`);
      continue;
    }

    const athlete = toAthleteProfile(
      (submission.athlete as Record<string, unknown>) || {}
    );
    const schools = (Array.isArray(submission.schools)
      ? submission.schools
      : []) as TrackedSchool[];

    log(`- ${c.email}: ${schools.length} school(s), athlete ${athlete.first_name}...`);

    try {
      const result = await runForCustomer({
        supabase,
        anthropic,
        resend,
        model,
        fromEmail,
        customer: { id: c.id, email: c.email, referral_code: c.referral_code },
        athlete,
        schools,
        dryRun,
        maxDraftsBeforeHold,
      });
      processed++;
      if (result.sent) sent++;
      outcomes.push({ email: c.email, ok: true, result });
      log(
        `  -> tracked ${result.schools_tracked}, ` +
          `${result.is_baseline ? "BASELINE" : `${result.triggers_count} changes, ${result.drafts_count} drafts`}` +
          `${result.failures ? `, ${result.failures} scrape failures` : ""}` +
          `${result.held ? `, HELD (${result.skipped_reason})` : result.sent ? `, sent (${result.message_id})` : result.skipped_reason ? `, skipped (${result.skipped_reason})` : dryRun ? ", not sent (dry run)" : ", NOT sent"}`
      );
      for (const f of result.failure_details) {
        log(`     [scrape failed] ${f.school} <${f.roster_url}>: ${f.error}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      outcomes.push({ email: c.email, ok: false, error: msg });
      log(`  -> [ERROR] ${msg}`);
    }
  }

  log(`\n=== Done. Processed ${processed}, sent ${sent}. ===\n`);

  // ---- Founder ops summary: one email so Tony sees run health at a glance ----
  if (outcomes.length > 0) {
    const summary = buildOpsSummary(outcomes, dryRun);
    log(`\n--- ops summary ---\n${summary.text}\n`);
    if (resend) {
      const res = await resend.emails.send({
        from: fromEmail,
        to: opsEmail,
        subject: summary.subject,
        text: summary.text,
        html: summary.html,
      });
      if (res.error) log(`[WARN] ops summary send failed: ${JSON.stringify(res.error)}`);
      else log(`Ops summary sent to ${opsEmail} (${res.data?.id}).`);
    } else {
      log(`(dry run — ops summary not emailed; would go to ${opsEmail})`);
    }
  }
}

main().catch((err) => {
  log(`[FATAL] ${err instanceof Error ? err.stack : err}`);
  process.exit(1);
});
