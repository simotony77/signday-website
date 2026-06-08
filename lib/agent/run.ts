import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { scrapeSchool, scrapeSchedule } from "./scrape";
import { diffSchools, diffSchedule, canonicalRole } from "./diff";
import { generateDraft, type DraftKind } from "./draft";
import { researchSchool } from "./research";
import { MIN_ROSTER } from "./scrape";
import { mintAccessToken } from "../accessToken";
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
    school.coaching_staff.find((c) => canonicalRole(c.title) === "head")
      ?.name ?? null
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Head coach's email, but ONLY if the scrape captured a real, valid-looking
// address (the extractor is told never to invent one). The athlete still sees
// and confirms the recipient in Gmail before sending, so this just saves a
// lookup; a missing/invalid value safely leaves the "To" blank.
function headCoachEmailOf(school: SchoolData): string | null {
  const email = school.coaching_staff
    .find((c) => canonicalRole(c.title) === "head")
    ?.email?.trim();
  return email && EMAIL_RE.test(email) ? email : null;
}

// Manual outreach status the parent maintains on the tracker page.
interface OutreachStatusRow {
  school_name: string;
  status: string;
  last_contacted_at: string | null;
  agent_note?: string | null;
}

function normSchoolKey(s: string): string {
  return s.trim().toLowerCase();
}

// Days since the athlete last emailed this coach, but ONLY while awaiting a
// reply (status 'sent'). Returns null otherwise (replied / not contacted /
// dropped / no date), so silence never fires once a coach has engaged.
function silentDays(row?: OutreachStatusRow): number | null {
  if (!row || row.status !== "sent" || !row.last_contacted_at) return null;
  const d = new Date(`${row.last_contacted_at}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

async function getOutreachStatuses(
  supabase: SupabaseClient,
  email: string
): Promise<Map<string, OutreachStatusRow>> {
  const map = new Map<string, OutreachStatusRow>();
  try {
    const { data } = await supabase
      .from("outreach_status")
      .select("school_name, status, last_contacted_at, agent_note")
      .eq("email", email);
    for (const r of (data as OutreachStatusRow[]) || []) {
      map.set(normSchoolKey(r.school_name), r);
    }
  } catch {
    /* tracker is best-effort; never break the run */
  }
  return map;
}

// When the agent detects a head-coach change, record it on the tracker row
// without clobbering the parent's status/notes (partial upsert updates only
// agent_note). Best-effort. Also updates the in-memory map so this week's
// digest snapshot reflects it.
async function flagCoachChangeOnTracker(
  supabase: SupabaseClient,
  statusMap: Map<string, OutreachStatusRow>,
  customerId: string | null,
  email: string,
  school: TrackedSchool,
  note: string
): Promise<void> {
  try {
    await supabase.from("outreach_status").upsert(
      {
        customer_id: customerId,
        email,
        school_name: school.name,
        roster_url: school.roster_url || null,
        agent_note: note,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email,school_name" }
    );
    const key = normSchoolKey(school.name);
    const existing = statusMap.get(key);
    if (existing) existing.agent_note = note;
    else
      statusMap.set(key, {
        school_name: school.name,
        status: "not_contacted",
        last_contacted_at: null,
        agent_note: note,
      });
  } catch {
    /* tracker write is best-effort; never break the run */
  }
}

// Pick at most ONE genuine reason to email a coach this week, by priority:
// a recent win, a head coach change, a new coach, then (lowest) a re-engagement
// nudge when a sent email has gone unanswered. Player adds/removes are
// deliberately NOT outreach reasons (noisy, unreliable, weird to cite), so they
// never spawn a draft.
export function chooseOutreachTrigger(
  rosterTriggersDiff: ReturnType<typeof diffSchools>,
  scheduleTriggers: string[],
  silenceTrigger?: string | null
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
  if (silenceTrigger) return silenceTrigger;
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

// Recipient label for the draft. Uses the title verbatim from the scrape (so
// we never invent or double-stamp "Women's Soccer Coach" onto a team name that
// already contains it). Falls back to the program when no head coach was read.
function coachLabel(school: SchoolData): string {
  const head = school.coaching_staff.find(
    (c) => canonicalRole(c.title) === "head"
  );
  return head ? `${head.name} (${head.title})` : `${school.team} coaching staff`;
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

  // Manual outreach statuses (tracker page) drive silence detection +
  // re-engagement drafts. Best-effort; absent for customers who never set them.
  const statusMap = await getOutreachStatuses(supabase, customer.email);

  // At most ONE first-touch (opener for a never-contacted school) per run, so
  // we never flood the digest or trip the circuit breaker.
  let firstTouchRemaining = 1;

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

      // If the head coach changed, flag it on the tracker (non-destructive:
      // updates only agent_note, leaving the parent's status/notes intact).
      if (!dryRun && rosterDiff.head_coach_changed) {
        const c = rosterDiff.head_coach_changed;
        await flagCoachChangeOnTracker(
          supabase,
          statusMap,
          customer.id,
          customer.email,
          school,
          `New head coach: ${c.to} (was ${c.from}), detected ${new Date()
            .toISOString()
            .slice(0, 10)}. Consider restarting outreach.`
        );
      }

      // Re-engagement: if the parent logged a sent email 21+ days ago with no
      // reply, that silence becomes a (lowest-priority) reason to nudge.
      const sd = silentDays(statusMap.get(normSchoolKey(school.name)));
      const silenceTrigger =
        sd !== null && sd >= 21
          ? `It has been ${sd} days since the last logged email to this coach with no reply. A short, low-pressure re-engagement (a recent result, an updated reel, or an upcoming camp) is a natural nudge.`
          : null;

      // At most ONE draft per school per week. Priority: a win/coaching change
      // (standard) > a 21-day silence (follow-up) > a first-touch opener for a
      // school the parent explicitly marked "not contacted".
      const outreachTrigger = chooseOutreachTrigger(
        rosterDiff,
        scheduleDiff.triggers,
        silenceTrigger
      );

      let draftTrigger: string | null = outreachTrigger;
      let draftKind: DraftKind = "standard";
      if (outreachTrigger && silenceTrigger && outreachTrigger === silenceTrigger) {
        draftKind = "followup";
      } else if (!outreachTrigger) {
        const st = statusMap.get(normSchoolKey(school.name));
        if (st?.status === "not_contacted" && firstTouchRemaining > 0) {
          firstTouchRemaining--;
          draftTrigger = `First contact: no prior outreach to ${after.team} has been logged yet. Open the conversation with a strong, specific introduction.`;
          draftKind = "first_touch";
        }
      }

      const drafts: SchoolResult["drafts"] = [];
      if (draftTrigger) {
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
            trigger: draftTrigger,
            kind: draftKind,
            schedule: afterSchedule,
            research,
          });
          drafts.push({
            ...draft,
            trigger: draftTrigger,
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

  // Tokened link to the school tracker (30-day token). Omitted if no secret
  // is configured in this environment.
  const trackerToken = mintAccessToken(customer.email, 30 * 24 * 3600);
  const trackerLink = trackerToken
    ? `${origin}/tracker?email=${encodeURIComponent(customer.email)}&token=${encodeURIComponent(trackerToken)}`
    : undefined;

  // Schools the parent marked 'sent' that have gone quiet (no reply logged).
  const quietSchools: { school: string; days: number }[] = [];
  // Per-school board for the digest — always shown, so a parent sees where
  // every school stands at a glance, even on quiet weeks.
  const trackerSummary: {
    school: string;
    status: string;
    days_silent: number | null;
    agent_note?: string | null;
  }[] = [];
  for (const school of schools) {
    const st = statusMap.get(normSchoolKey(school.name));
    const d = silentDays(st);
    if (d !== null && d >= 14) quietSchools.push({ school: school.name, days: d });
    trackerSummary.push({
      school: school.name,
      status: st?.status || "not_contacted",
      days_silent: d,
      agent_note: st?.agent_note ?? null,
    });
  }

  const digest = buildDigest({
    athlete_name: athleteName,
    results,
    referral_link: referralLink,
    camp_note: campCountdownNote(athlete),
    quiet_schools: quietSchools,
    tracker_link: trackerLink,
    tracker_summary: trackerSummary,
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
    recruit_type: raw.recruit_type === "transfer" ? "transfer" : "high_school",
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
