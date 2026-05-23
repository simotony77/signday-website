import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SCHOOL_SCRAPES, type SchoolData } from "@/lib/schoolScrapes";
import { SCHOOL_SCHEDULES } from "@/lib/schoolSchedules";
import { rateLimit } from "@/lib/rateLimit";
import { logDemoRun } from "@/lib/demoLog";
import type { ScheduleData, GameResult } from "@/lib/agent/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DRAFT_PROMPT_SYSTEM = `You are drafting a college coach outreach email on behalf of a high school athlete pursuing US college soccer recruiting.

Your output is a draft the athlete will edit and send from her own Gmail. Coaches receive hundreds of emails. Generic templates and AI-sounding prose get trashed within seconds. Your job is to produce a draft that reads like a real, slightly-nervous, well-prepared high school junior or senior wrote it themselves.

VOICE RULES (these are not negotiable):
- First-person. The athlete is the sender. The parent does not appear in the email body anywhere.
- Conversational, age-appropriate. A high school junior or senior writing in their own voice. NOT a 40-year-old marketing MBA.
- If you write phrases like "I am thrilled" / "I am excited to learn more about your program" / "I would be honored" / "I am writing to express my interest", you have failed. Coaches see those phrases 50 times a day and trash them.
- Slightly imperfect is good. Real teenagers aren't polished.
- No emojis. No "marketing-speak." No tracking URLs.
- No em-dashes (—) and no en-dashes (–). Real teenagers do not use these characters. Use periods, commas, or colons instead. For date ranges write "June 14-16" with a plain hyphen, never "June 14-16".
- 4 to 6 sentences in the body, plus a clear concrete next step.

GROUNDING RULES (most important):
- Reference SOMETHING the coach would recognize as program-aware. But only use details that appear EXPLICITLY in the school context provided.
- Do NOT invent claims about the program's playing style, tactics, or philosophy. If the school context does not mention how the team plays, do not write that.
- Safe references include: graduating seniors at the position (provided in the trigger or roster), the coach's name, the position transition needs.
- If you cannot ground a "fit" claim in provided data, replace it with something the athlete can credibly say about herself instead of about the program.

STRUCTURE:
- Greeting: "Hi Coach [LastName]," using the head coach's last name from the school context.
- Opening: 1 sentence that names the specific recent change.
- Middle: 2-3 sentences introducing the athlete with grad year, position, club, and one of her strengths.
- Ask: 1 clear next-step. Offer to send updated reel, propose a Zoom, name an upcoming camp.
- Sign-off: athlete's first name only.

SUBJECT LINE RULES:
- Specific. Reference grad year, position, and ideally the trigger.
- 6-10 words max.
- No "Hello Coach" / "Recruiting Interest" / "Following Up."

OUTPUT FORMAT:
Return ONLY this JSON object. No markdown code fences. No commentary.

{
  "subject": "...",
  "body": "..."
}

The body should be the full email body INCLUDING the greeting and sign-off, but NOT the subject line. Use plain \\n for line breaks between paragraphs.`;

interface DemoRequest {
  first_name: string;
  grad_year: number;
  position: string;
  club: string;
  school_slug: string;
}

interface PositionRequirements {
  match: (p: string) => boolean;
  label: string;
}

const POSITION_MATCHERS: Record<string, PositionRequirements> = {
  GK: {
    match: (p) => /GK/i.test(p),
    label: "goalkeeper",
  },
  D: {
    match: (p) => /D/i.test(p) && !/GK/i.test(p),
    label: "defender",
  },
  M: {
    match: (p) => /M/i.test(p) && !/GK/i.test(p),
    label: "midfielder",
  },
  F: {
    match: (p) => /F/i.test(p) && !/GK/i.test(p),
    label: "forward",
  },
};

function mostRecentWin(schedule?: ScheduleData): GameResult | null {
  if (!schedule?.recent_results?.length) return null;
  return schedule.recent_results.find((g) => g.is_win) ?? null;
}

function buildTrigger(
  school: SchoolData,
  athletePosition: string,
  schedule?: ScheduleData
): string {
  // Prefer a recent win as the lead reason to reach out (the most natural,
  // timely hook), then add the roster/position angle as supporting context.
  const win = mostRecentWin(schedule);
  const winPart = win
    ? `${school.team} won ${win.result} vs ${win.opponent}${win.date ? ` (${win.date})` : ""}. A recent win is a timely, specific reason to reach out now. `
    : "";

  const matcher = POSITION_MATCHERS[athletePosition];
  let rosterPart: string;
  if (!matcher) {
    rosterPart = `Class of 2027 introduction to ${school.team}.`;
  } else {
    const graduatingAtPosition = school.roster.filter(
      (p) => p.graduating === true && matcher.match(p.position)
    );
    if (graduatingAtPosition.length === 0) {
      const anyGraduating = school.roster.filter((p) => p.graduating === true);
      rosterPart =
        anyGraduating.length > 0
          ? `Senior class graduating this spring, exploring fit for next cycle at ${school.team}.`
          : `Class of 2027 introduction to ${school.team}, looking ahead to next cycle.`;
    } else {
      const names = graduatingAtPosition.map((p) => p.name).join(", ");
      const positionWord = matcher.label;
      rosterPart = `Senior ${positionWord}${graduatingAtPosition.length === 1 ? "" : "s"} ${names} graduating spring 2026, program will need ${positionWord} depth next cycle.`;
    }
  }

  return (winPart + rosterPart).trim();
}

function buildUserPrompt(
  school: SchoolData,
  athlete: DemoRequest,
  trigger: string,
  schedule?: ScheduleData
): string {
  // Build a minimal athlete profile for the prompt
  const athleteProfile = {
    first_name: athlete.first_name,
    grad_year: athlete.grad_year,
    position: athlete.position,
    club: athlete.club,
  };

  let scheduleBlock = "";
  if (schedule && (schedule.recent_results?.length || schedule.record)) {
    scheduleBlock = `

SCHEDULE CONTEXT (recent results and record, scraped from the program's schedule page):
\`\`\`json
${JSON.stringify(
  {
    record: schedule.record ?? null,
    recent_results: schedule.recent_results?.slice(0, 5) ?? [],
    next_game: schedule.upcoming?.[0] ?? null,
  },
  null,
  2
)}
\`\`\``;
  }

  return `SCHOOL CONTEXT (scraped from the program's athletics page):
\`\`\`json
${JSON.stringify(school, null, 2)}
\`\`\`

ATHLETE PROFILE:
\`\`\`json
${JSON.stringify(athleteProfile, null, 2)}
\`\`\`${scheduleBlock}

TRIGGER (the specific reason this email is being sent now):
${trigger}

Generate the draft.`;
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server not configured (missing ANTHROPIC_API_KEY)." },
      { status: 500 }
    );
  }

  // Cached path: cheaper (one model call), so a looser limit: 25/IP/hour.
  const rl = await rateLimit(req, "demo-draft", 25, 3600);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many demo runs in a short window. Give it a few minutes." },
      { status: 429 }
    );
  }

  let body: DemoRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Basic validation
  if (
    !body.first_name?.trim() ||
    !body.club?.trim() ||
    !body.school_slug ||
    !body.position ||
    typeof body.grad_year !== "number"
  ) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const school: SchoolData | undefined = SCHOOL_SCRAPES[body.school_slug];
  if (!school) {
    return NextResponse.json({ error: "Unknown school." }, { status: 400 });
  }

  // Cap input sizes to keep abuse cheap to handle
  if (body.first_name.length > 50 || body.club.length > 100) {
    return NextResponse.json({ error: "Input too long." }, { status: 400 });
  }

  const schedule: ScheduleData | undefined = SCHOOL_SCHEDULES[body.school_slug];
  const trigger = buildTrigger(school, body.position, schedule);
  const headCoach = school.coaching_staff.find((c) => /head coach/i.test(c.title));
  const coachLabel = headCoach
    ? `${headCoach.name} (${school.team} Head Coach)`
    : `${school.team} Women's Soccer Coach`;

  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-5";
  const anthropic = new Anthropic({ apiKey });

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1500,
      system: DRAFT_PROMPT_SYSTEM,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(school, body, trigger, schedule),
        },
      ],
    });

    const firstBlock = response.content[0];
    if (firstBlock.type !== "text") {
      return NextResponse.json({ error: "Generation failed." }, { status: 500 });
    }

    const jsonText = stripCodeFences(firstBlock.text);
    const draft = JSON.parse(jsonText);
    if (typeof draft?.subject !== "string" || typeof draft?.body !== "string") {
      return NextResponse.json({ error: "Generation returned bad shape." }, { status: 500 });
    }

    // Build school monitoring summary so the demo can show the full agent
    // pipeline (monitoring -> detection -> drafting -> delivery) and not look
    // like just an email generator.
    const positionCounts = {
      GK: school.roster.filter((p) => /GK/i.test(p.position)).length,
      D: school.roster.filter((p) => /D/i.test(p.position) && !/GK/i.test(p.position)).length,
      M: school.roster.filter((p) => /M/i.test(p.position) && !/GK/i.test(p.position)).length,
      F: school.roster.filter((p) => /F/i.test(p.position) && !/GK/i.test(p.position)).length,
    };
    const graduatingSeniors = school.roster
      .filter((p) => p.graduating === true)
      .map((p) => ({ name: p.name, position: p.position, class_year: p.class_year }));

    await logDemoRun(req, "cached", body.school_slug);

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
    });
  } catch (err) {
    console.error("demo-draft error:", err);
    return NextResponse.json(
      { error: "Generation failed. Please try again." },
      { status: 500 }
    );
  }
}
