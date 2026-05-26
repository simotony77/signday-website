import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { scrapeSchool, scrapeSchedule } from "./scrape";
import { diffSchools, diffSchedule } from "./diff";
import { generateDraft } from "./draft";
import { researchSchool } from "./research";
import { MIN_ROSTER } from "./scrape";
import { buildDigest, type SchoolResult } from "./digest";
import type {
  AthleteProfile,
  SchoolData,
  ScheduleData,
  SchoolSnapshot,
  TrackedSchool,
} from "./types";

export interface CustomerRunInput {
  supabase: SupabaseClient;
  anthropic: Anthropic;
  resend: Resend | null; // null = dry run (build digest but don't send)
  model: string;
  fromEmail: string;
  customer: { id: string | null; email: string; referral_code?: string | null };
  athlete: AthleteProfile;
  schools: TrackedSchool[];
  // When true, don't persist snapshots or log the digest. Used for diagnostic
  // dry runs so they don't mutate state or pollute week-over-week diffing.
  dryRun?: boolean;
  // Circuit breaker: if a single customer's digest would contain MORE than this
  // many drafts, we HOLD it (don't send) and flag it for human review instead.
  // A backstop for unanticipated failure modes — with the 1-draft-per-school cap
  // a normal week is 0-2 drafts, so an abnormal volume signals something wrong.
  // Defaults to no limit when unset.
  maxDraftsBeforeHold?: number;
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
  // True when the digest was built but withheld by the circuit breaker
  // (drafts_count exceeded maxDraftsBeforeHold) for human review.
  held?: boolean;
}

function headCoachOf(school: SchoolData): string | null {
  return (
    school.coaching_staff.find((c) => /head coach/i.test(c.title))?.name ?? null
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Head coach's email, but ONLY if the scrape captured a real, valid-looking
// address (the extractor is told never to invent one). The athlete still sees
// and confirms the recipient in Gmail before sending, so this just saves a
// lookup; a missing/invalid value safely leaves the "To" blank.
function headCoachEmailOf(school: SchoolData): string | null {
  const email = school.coaching_staff
    .find((c) => /head coach/i.test(c.title))
    ?.email?.trim();
  return email && EMAIL_RE.test(email) ? email : null;
}

// Pick at most ONE genuine reason to email a coach this week. Real outreach
// moments only: a recent win, or a coaching change. Player adds/removes are
// deliberately NOT outreach reasons (they're noisy, unreliable from scraping,
// and a weird thing to cite to a coach), so they never spawn a draft.
export function chooseOutreachTrigger(
  rosterTriggersDiff: ReturnType<typeof diffSchools>,
  scheduleTriggers: string[]
): string | null {
  if (scheduleTriggers.length > 0) return scheduleTriggers[0]; // recent win
  if (rosterTriggersDiff.head_coach_changed) {
    const c = rosterTriggersDiff.head_coach_changed;
    return `Head coach changed from ${c.from} to ${c.to}. A natural moment to introduce yourself to the new staff.`;
  }
  const newCoach = rosterTriggersDiff.coaches_added[0];
  if (newCoach) {
    return `New coach on staff: ${newCoach.name} (${newCoach.title}). A natural reason to reach out.`;
  }
  return null;
}

// A real roster doesn't lose a big chunk of players in a single week. When it
// looks like it did, this week's scrape was almost certainly partial/degraded,
// so we don't trust it. Only applies once we have a real baseline to compare
// against (>= MIN_ROSTER players last week); tiny rosters are left alone.
export function isDegradedRoster(
  beforeSize: number,
  removedCount: number,
  afterSize: number
): boolean {
  if (beforeSize < MIN_ROSTER) return false;
  if (removedCount > 5 && removedCount / beforeSize > 0.3) return true;
  if (afterSize < beforeSize * 0.6) return true;
  return false;
}

function coachLabel(school: SchoolData): string {
  const head = school.coaching_staff.find((c) => /head coach/i.test(c.title));
  return head
    ? `${head.name} (${school.team} Head Coach)`
    : `${school.team} Women's Soccer Coach`;
}

// Normalize a stored snapshot into the combined shape. Older rows stored a
// bare SchoolData (with a `roster` array); newer rows store { school, schedule }.
function normalizeSnapshot(raw: unknown): SchoolSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.school && typeof obj.school === "object") {
    return obj as unknown as SchoolSnapshot; // new shape
  }
  if (Array.isArray(obj.roster)) {
    return { school: raw as SchoolData }; // old shape: bare SchoolData
  }
  return null;
}

// Fetch the most recent stored snapshot for a (email, roster_url) pair.
async function getLastSnapshot(
  supabase: SupabaseClient,
  email: string,
  rosterUrl: string
): Promise<SchoolSnapshot | null> {
  const { data } = await supabase
    .from("school_snapshots")
    .select("snapshot")
    .eq("email", email)
    .eq("roster_url", rosterUrl)
    .order("scraped_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return normalizeSnapshot(data?.snapshot);
}

async function saveSnapshot(
  supabase: SupabaseClient,
  customerId: string | null,
  email: string,
  schoolName: string,
  rosterUrl: string,
  snapshot: SchoolSnapshot
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

      // Schedule is best-effort. A failure here must not break roster monitoring.
      let afterSchedule: ScheduleData | null = null;
      try {
        afterSchedule = await scrapeSchedule({
          url: school.roster_url,
          anthropic,
          model,
        });
      } catch (e) {
        console.error(
          `schedule scrape failed for ${school.name}:`,
          e instanceof Error ? e.message : e
        );
      }

      const before = await getLastSnapshot(
        supabase,
        customer.email,
        school.roster_url
      );

      if (!before) {
        // Baseline week: nothing to diff against yet. Save and report.
        if (!dryRun) {
          await saveSnapshot(
            supabase,
            customer.id,
            customer.email,
            school.name,
            school.roster_url,
            { school: after, schedule: afterSchedule }
          );
        }
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

      const rosterDiff = diffSchools(before.school, after);
      const scheduleDiff = diffSchedule(before.schedule, afterSchedule);

      // Safety net: a real roster doesn't lose a big chunk of players in a week.
      // If it looks like it did, this week's scrape was almost certainly partial,
      // so we DON'T trust it: skip drafts and keep the last good snapshot (don't
      // overwrite) so next week diffs against clean data.
      const beforeSize = before.school.roster?.length || 0;
      const removed = rosterDiff.players_removed.length;
      const badScrape = isDegradedRoster(beforeSize, removed, after.roster.length);

      if (badScrape) {
        results.push({
          school_name: school.name || after.team,
          roster_url: school.roster_url,
          is_baseline: false,
          triggers: [],
          drafts: [],
          roster_size: beforeSize,
          head_coach: headCoachOf(before.school),
          error: `Roster page didn't read cleanly this week (${after.roster.length} of ~${beforeSize} players). Skipped to avoid false changes; will retry next run.`,
        });
        continue; // do NOT save snapshot — preserve the last good baseline
      }

      // Trusted read: persist this week's snapshot (skipped on dry runs).
      if (!dryRun) {
        await saveSnapshot(
          supabase,
          customer.id,
          customer.email,
          school.name,
          school.roster_url,
          { school: after, schedule: afterSchedule }
        );
      }

      // Informational "what changed" summary for the digest (capped).
      const changeSummary = [
        ...rosterDiff.triggers,
        ...scheduleDiff.triggers,
      ].slice(0, 8);

      // At most ONE draft per school per week, on a real outreach moment only.
      const outreachTrigger = chooseOutreachTrigger(
        rosterDiff,
        scheduleDiff.triggers
      );

      const drafts: SchoolResult["drafts"] = [];
      if (outreachTrigger) {
        // Research only runs when we're actually going to draft.
        const research = await researchSchool({
          schoolName: school.name || after.team,
          teamName: after.team,
          anthropic,
          model,
        });
        try {
          const draft = await generateDraft({
            anthropic,
            model,
            school: after,
            athlete,
            trigger: outreachTrigger,
            schedule: afterSchedule,
            research,
          });
          drafts.push({
            ...draft,
            trigger: outreachTrigger,
            coach: coachLabel(after),
            coach_email: headCoachEmailOf(after),
          });
        } catch (e) {
          console.error(
            `draft failed for ${school.name}:`,
            e instanceof Error ? e.message : e
          );
        }
      }

      results.push({
        school_name: school.name || after.team,
        roster_url: school.roster_url,
        is_baseline: false,
        triggers: changeSummary,
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
  const origin =
    process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://www.signdayapp.com";
  const referralLink = customer.referral_code
    ? `${origin}/?ref=${encodeURIComponent(customer.referral_code)}`
    : undefined;
  const digest = buildDigest({
    athlete_name: athleteName,
    results,
    referral_link: referralLink,
    camp_note: campCountdownNote(athlete),
  });

  // Circuit breaker: an abnormal number of drafts in one digest signals a
  // failure mode we didn't anticipate (e.g. a new way a page reads dirty). Hold
  // the whole digest for human review rather than emailing a suspicious volume.
  const draftCap = input.maxDraftsBeforeHold ?? Infinity;
  const held = digest.drafts_count > draftCap;

  let sent = false;
  let messageId: string | undefined;
  if (held) {
    console.error(
      `[HOLD] ${customer.email}: ${digest.drafts_count} drafts exceeds cap of ${draftCap} — NOT sending, flagged for review`
    );
  } else if (resend) {
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
        held,
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
    held,
    skipped_reason: held
      ? `held for review: ${digest.drafts_count} drafts exceeded cap of ${draftCap}`
      : undefined,
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
    gender: raw.gender === "boys" ? "boys" : "girls",
    current_league: raw.current_league ? String(raw.current_league) : undefined,
    division: raw.division ? String(raw.division) : undefined,
    club: String(raw.club ?? ""),
    gpa: num(raw.gpa),
    test_score: num(raw.test_score),
    reel_url: raw.reel_url ? String(raw.reel_url) : undefined,
    video_url: raw.reel_url ? String(raw.reel_url) : undefined,
    email: String(raw.email ?? ""),
    next_camp_name: raw.next_camp_name ? String(raw.next_camp_name) : undefined,
    next_camp_date: raw.next_camp_date ? String(raw.next_camp_date) : undefined,
  };
}

// A short, time-sensitive countdown to the athlete's next ID camp / showcase,
// for the top of the weekly digest. Returns undefined if there's no upcoming
// camp date (or it's already passed).
export function campCountdownNote(athlete: AthleteProfile): string | undefined {
  if (!athlete.next_camp_date) return undefined;
  const when = new Date(athlete.next_camp_date);
  if (isNaN(when.getTime())) return undefined;
  const days = Math.ceil((when.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return undefined; // camp already happened
  const name = athlete.next_camp_name?.trim() || "your next ID camp";
  if (days === 0) return `${name} is today. Good week to make sure outreach is in.`;
  if (days < 14) return `${days} day${days === 1 ? "" : "s"} until ${name}.`;
  return `${Math.round(days / 7)} weeks until ${name}.`;
}
