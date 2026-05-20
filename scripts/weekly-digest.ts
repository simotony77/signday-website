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
import { runForCustomer, toAthleteProfile } from "../lib/agent/run";
import type { TrackedSchool } from "../lib/agent/types";

function log(...args: unknown[]) {
  // stderr is unbuffered on Windows; keeps logs visible during local runs.
  console.error(...args);
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
    .select("id, email, subscription_status, onboarded_at")
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
        customer: { id: c.id, email: c.email },
        athlete,
        schools,
      });
      processed++;
      if (result.sent) sent++;
      log(
        `  -> tracked ${result.schools_tracked}, ` +
          `${result.is_baseline ? "BASELINE" : `${result.triggers_count} changes, ${result.drafts_count} drafts`}` +
          `${result.failures ? `, ${result.failures} scrape failures` : ""}` +
          `${result.sent ? `, sent (${result.message_id})` : result.skipped_reason ? `, skipped (${result.skipped_reason})` : dryRun ? ", not sent (dry run)" : ", NOT sent"}`
      );
    } catch (e) {
      log(`  -> [ERROR] ${e instanceof Error ? e.message : e}`);
    }
  }

  log(`\n=== Done. Processed ${processed}, sent ${sent}. ===\n`);
}

main().catch((err) => {
  log(`[FATAL] ${err instanceof Error ? err.stack : err}`);
  process.exit(1);
});
