import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { findRosterUrl } from "@/lib/agent/findRosterUrl";
import { scrapeSchool, scrapeSchedule } from "@/lib/agent/scrape";
import { generateDraft } from "@/lib/agent/draft";
import { rateLimit } from "@/lib/rateLimit";
import { logDemoRun } from "@/lib/demoLog";
import type {
  AthleteProfile,
  SchoolData,
  ScheduleData,
  GameResult,
} from "@/lib/agent/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface LiveRequest {
  first_name?: string;
  grad_year?: number;
  position?: string;
  club?: string;
  school_name?: string;
  gender?: "boys" | "girls";
}

const POSITION_LABEL: Record<string, string> = {
  GK: "goalkeeper",
  D: "defender",
  M: "midfielder",
  F: "forward",
};

function matchesPosition(athlete: string, p: string): boolean {
  if (athlete === "GK") return /GK/i.test(p);
  if (athlete === "D") return /D/i.test(p) && !/GK/i.test(p);
  if (athlete === "M") return /M/i.test(p) && !/GK/i.test(p);
  if (athlete === "F") return /F/i.test(p) && !/GK/i.test(p);
  return false;
}

function mostRecentWin(schedule: ScheduleData | null): GameResult | null {
  if (!schedule?.recent_results?.length) return null;
  return schedule.recent_results.find((g) => g.is_win) ?? null;
}

function buildTrigger(
  school: SchoolData,
  position: string,
  schedule: ScheduleData | null
): string {
  const win = mostRecentWin(schedule);
  const winPart = win
    ? `${school.team} won ${win.result} vs ${win.opponent}${win.date ? ` (${win.date})` : ""}. A recent win is a timely, specific reason to reach out now. `
    : "";

  const label = POSITION_LABEL[position];
  let rosterPart: string;
  if (!label) {
    rosterPart = `Class of introduction to ${school.team}.`;
  } else {
    const gradAtPos = school.roster.filter(
      (p) => p.graduating === true && matchesPosition(position, p.position)
    );
    if (gradAtPos.length > 0) {
      const names = gradAtPos.map((p) => p.name).join(", ");
      rosterPart = `Senior ${label}${gradAtPos.length === 1 ? "" : "s"} ${names} graduating, program will need ${label} depth next cycle.`;
    } else {
      const anyGrad = school.roster.filter((p) => p.graduating === true);
      rosterPart =
        anyGrad.length > 0
          ? `Senior class graduating this spring, exploring fit at ${school.team}.`
          : `Introduction to ${school.team}, looking ahead to next cycle.`;
    }
  }
  return (winPart + rosterPart).trim();
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server not configured." },
      { status: 500 }
    );
  }

  // Live runs are the most expensive call (web search + multiple model calls),
  // so the tightest limit: 6 per IP per hour.
  const rl = await rateLimit(req, "demo-live", 6, 3600);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "You've run a lot of live demos in a short window. Give it a few minutes, or pick one of the popular schools above." },
      { status: 429 }
    );
  }

  let body: LiveRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const firstName = (body.first_name || "").trim();
  const club = (body.club || "").trim();
  const position = body.position || "";
  const schoolName = (body.school_name || "").trim();
  const gradYear = body.grad_year;

  if (
    !firstName ||
    !club ||
    !position ||
    !schoolName ||
    typeof gradYear !== "number"
  ) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (firstName.length > 50 || club.length > 100 || schoolName.length > 100) {
    return NextResponse.json({ error: "Input too long." }, { status: 400 });
  }

  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-5";
  const anthropic = new Anthropic({ apiKey });
  const gender: "boys" | "girls" = body.gender === "boys" ? "boys" : "girls";
  const program = gender === "boys" ? "mens" : "womens";

  // 1. Find the roster URL.
  const found = await findRosterUrl({ schoolName, anthropic, model, program });
  if (!found.url) {
    return NextResponse.json(
      {
        error: `I couldn't find a women's soccer roster page for "${schoolName}" automatically. Try the exact school name (e.g. "Williams College"), or pick one of the popular schools above.`,
      },
      { status: 422 }
    );
  }

  // 2. Scrape roster (required) + schedule (best effort).
  let school: SchoolData;
  try {
    school = await scrapeSchool({ url: found.url, anthropic, model });
  } catch {
    return NextResponse.json(
      {
        error: `I found ${schoolName}'s page but couldn't read its roster (some athletics sites block automated reads). Try another school, or one of the popular ones above. In the full product, these get handled.`,
      },
      { status: 422 }
    );
  }

  let schedule: ScheduleData | null = null;
  try {
    schedule = await scrapeSchedule({ url: found.url, anthropic, model });
  } catch {
    schedule = null;
  }

  // 3. Trigger + draft.
  const trigger = buildTrigger(school, position, schedule);
  const headCoach = school.coaching_staff.find((c) => /head coach/i.test(c.title));
  const coachLabel = headCoach
    ? `${headCoach.name} (${school.team} Head Coach)`
    : `${school.team} Women's Soccer Coach`;

  const athlete: AthleteProfile = {
    first_name: firstName,
    last_name: "",
    grad_year: gradYear,
    position,
    gender,
    club,
    gpa: null,
    email: "",
  };

  let draft;
  try {
    draft = await generateDraft({
      anthropic,
      model,
      school,
      athlete,
      trigger,
      schedule,
    });
  } catch {
    return NextResponse.json(
      { error: "Drafting failed. Please try again." },
      { status: 500 }
    );
  }

  // 4. Monitoring summary (same shape as /api/demo-draft).
  const positionCounts = {
    GK: school.roster.filter((p) => /GK/i.test(p.position)).length,
    D: school.roster.filter((p) => /D/i.test(p.position) && !/GK/i.test(p.position)).length,
    M: school.roster.filter((p) => /M/i.test(p.position) && !/GK/i.test(p.position)).length,
    F: school.roster.filter((p) => /F/i.test(p.position) && !/GK/i.test(p.position)).length,
  };
  const graduatingSeniors = school.roster
    .filter((p) => p.graduating === true)
    .map((p) => ({ name: p.name, position: p.position, class_year: p.class_year }));

  await logDemoRun(req, "live", schoolName);

  return NextResponse.json({
    monitoring: {
      team: school.team,
      season: school.season,
      roster_size: school.roster.length,
      head_coach: headCoach?.name || null,
      assistant_coaches: school.coaching_staff
        .filter((c) => !/head coach/i.test(c.title))
        .map((c) => ({ name: c.name, title: c.title })),
      position_counts: positionCounts,
      graduating_seniors: graduatingSeniors,
      record: schedule?.record ?? null,
      recent_results: (schedule?.recent_results ?? []).slice(0, 5),
      next_game: schedule?.upcoming?.[0] ?? null,
    },
    trigger,
    draft: {
      subject: draft.subject,
      body: draft.body,
      coach: coachLabel,
      school_name: school.team,
    },
    resolved: { school_name: schoolName, roster_url: found.url },
  });
}
