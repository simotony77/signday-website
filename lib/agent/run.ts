import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { scrapeSchool } from "./scrape";
import { diffSchools } from "./diff";
import { generateDraft } from "./draft";
import { buildDigest, type SchoolResult } from "./digest";
import type { AthleteProfile, SchoolData, TrackedSchool } from "./types";

export interface CustomerRunInput {
  supabase: SupabaseClient;
  anthropic: Anthropic;
  resend: Resend | null; // null = dry run (build digest but don't send)
  model: string;
  fromEmail: string;
  customer: { id: string | null; email: string };
  athlete: AthleteProfile;
  schools: TrackedSchool[];
  // When true, don't persist snapshots or log the digest. Used for diagnostic
  // dry runs so they don't mutate state or pollute week-over-week diffing.
  dryRun?: boolean;
}

export interface CustomerRunResult {
  email: string;
  schools_tracked: number;
  is_baseline: boolean;
  triggers_count: number;
  drafts_count: number;
  failures: number;
  failure_details: { school: string; roster_url: string; error: string }[];
  sent: boolean;
  message_id?: string;
  skipped_reason?: string;
}

function headCoachOf(school: SchoolData): string | null {
  return (
    school.coaching_staff.find((c) => /head coach/i.test(c.title))?.name ?? null
  );
}

function coachLabel(school: SchoolData): string {
  const head = school.coaching_staff.find((c) => /head coach/i.test(c.title));
  return head
    ? `${head.name} (${school.team} Head Coach)`
    : `${school.team} Women's Soccer Coach`;
}

// Fetch the most recent stored snapshot for a (email, roster_url) pair.
async function getLastSnapshot(
  supabase: SupabaseClient,
  email: string,
  rosterUrl: string
): Promise<SchoolData | null> {
  const { data } = await supabase
    .from("school_snapshots")
    .select("snapshot")
    .eq("email", email)
    .eq("roster_url", rosterUrl)
    .order("scraped_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.snapshot as SchoolData) ?? null;
}

async function saveSnapshot(
  supabase: SupabaseClient,
  customerId: string | null,
  email: string,
  schoolName: string,
  rosterUrl: string,
  snapshot: SchoolData
): Promise<void> {
  await supabase.from("school_snapshots").insert({
    customer_id: customerId,
    email,
    school_name: schoolName,
    roster_url: rosterUrl,
    snapshot,
  });
}

// Run the full pipeline for one customer: scrape each school, diff against
// last week, draft emails for any changes, send the digest, log it.
export async function runForCustomer(
  input: CustomerRunInput
): Promise<CustomerRunResult> {
  const { supabase, anthropic, resend, model, fromEmail, customer, athlete } =
    input;
  const dryRun = input.dryRun ?? false;

  const schools = input.schools.filter((s) => s.roster_url && s.roster_url.trim());
  if (schools.length === 0) {
    return {
      email: customer.email,
      schools_tracked: 0,
      is_baseline: false,
      triggers_count: 0,
      drafts_count: 0,
      failures: 0,
      failure_details: [],
      sent: false,
      skipped_reason: "no schools with roster URLs",
    };
  }

  const results: SchoolResult[] = [];

  for (const school of schools) {
    try {
      const after = await scrapeSchool({
        url: school.roster_url,
        anthropic,
        model,
      });

      const before = await getLastSnapshot(
        supabase,
        customer.email,
        school.roster_url
      );

      // Persist this week's snapshot (skipped on dry runs so we don't
      // pollute week-over-week diff state).
      if (!dryRun) {
        await saveSnapshot(
          supabase,
          customer.id,
          customer.email,
          school.name,
          school.roster_url,
          after
        );
      }

      if (!before) {
        // Baseline week: nothing to diff against yet.
        results.push({
          school_name: school.name || after.team,
          roster_url: school.roster_url,
          is_baseline: true,
          triggers: [],
          drafts: [],
          roster_size: after.roster.length,
          head_coach: headCoachOf(after),
        });
        continue;
      }

      const diff = diffSchools(before, after);
      const drafts: SchoolResult["drafts"] = [];
      for (const trigger of diff.triggers) {
        try {
          const draft = await generateDraft({
            anthropic,
            model,
            school: after,
            athlete,
            trigger,
          });
          drafts.push({ ...draft, trigger, coach: coachLabel(after) });
        } catch (e) {
          // A single draft failure shouldn't sink the school's whole entry.
          console.error(
            `draft failed for ${school.name} (${trigger}):`,
            e instanceof Error ? e.message : e
          );
        }
      }

      results.push({
        school_name: school.name || after.team,
        roster_url: school.roster_url,
        is_baseline: false,
        triggers: diff.triggers,
        drafts,
        roster_size: after.roster.length,
        head_coach: headCoachOf(after),
      });
    } catch (e) {
      results.push({
        school_name: school.name,
        roster_url: school.roster_url,
        is_baseline: false,
        triggers: [],
        drafts: [],
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const athleteName = athlete.first_name || "your athlete";
  const digest = buildDigest({ athlete_name: athleteName, results });

  let sent = false;
  let messageId: string | undefined;
  if (resend) {
    const result = await resend.emails.send({
      from: fromEmail,
      to: customer.email,
      subject: digest.subject,
      text: digest.text,
      html: digest.html,
    });
    if (result.error) {
      console.error(`digest send failed for ${customer.email}:`, result.error);
    } else {
      sent = true;
      messageId = result.data?.id;
    }
  }

  // Log the digest run (skipped on dry runs).
  if (!dryRun) {
    await supabase.from("digests").insert({
      customer_id: customer.id,
      email: customer.email,
      schools_tracked: digest.schools_tracked,
      triggers_count: digest.triggers_count,
      drafts_count: digest.drafts_count,
      is_baseline: digest.is_baseline,
      detail: {
        results: results.map((r) => ({
          school: r.school_name,
          baseline: r.is_baseline,
          triggers: r.triggers.length,
          drafts: r.drafts.length,
          error: r.error ?? null,
        })),
        message_id: messageId ?? null,
      },
    });
  }

  return {
    email: customer.email,
    schools_tracked: digest.schools_tracked,
    is_baseline: digest.is_baseline,
    triggers_count: digest.triggers_count,
    drafts_count: digest.drafts_count,
    failures: results.filter((r) => r.error).length,
    failure_details: results
      .filter((r) => r.error)
      .map((r) => ({
        school: r.school_name,
        roster_url: r.roster_url,
        error: r.error || "unknown",
      })),
    sent,
    message_id: messageId,
  };
}

// Map a raw onboarding athlete JSON blob into the AthleteProfile shape the
// drafter expects. Tolerant of missing fields.
export function toAthleteProfile(raw: Record<string, unknown>): AthleteProfile {
  const num = (v: unknown): number | null =>
    typeof v === "number" ? v : v != null && !isNaN(Number(v)) ? Number(v) : null;
  return {
    first_name: String(raw.first_name ?? ""),
    last_name: String(raw.last_name ?? ""),
    grad_year: typeof raw.grad_year === "number" ? raw.grad_year : Number(raw.grad_year) || 0,
    position: String(raw.position ?? ""),
    current_league: raw.current_league ? String(raw.current_league) : undefined,
    division: raw.division ? String(raw.division) : undefined,
    club: String(raw.club ?? ""),
    gpa: num(raw.gpa),
    test_score: num(raw.test_score),
    reel_url: raw.reel_url ? String(raw.reel_url) : undefined,
    video_url: raw.reel_url ? String(raw.reel_url) : undefined,
    email: String(raw.email ?? ""),
  };
}
