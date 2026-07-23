import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { findRosterUrl } from "@/lib/agent/findRosterUrl";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface FindRequest {
  school_name?: string;
  gender?: "boys" | "girls";
  sport?: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server not configured (missing ANTHROPIC_API_KEY)." },
      { status: 500 }
    );
  }

  // Onboarding auto-find calls this up to ~12 times per session, so allow
  // headroom but cap runaway use: 40/IP/hour.
  const rl = await rateLimit(req, "find-roster-url", 40, 3600);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many lookups in a short window. Give it a few minutes." },
      { status: 429 }
    );
  }

  let body: FindRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const schoolName =
    typeof body.school_name === "string" ? body.school_name.trim() : "";
  if (!schoolName) {
    return NextResponse.json({ error: "school_name required." }, { status: 400 });
  }
  if (schoolName.length > 100) {
    return NextResponse.json({ error: "school_name too long." }, { status: 400 });
  }

  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-5";
  const anthropic = new Anthropic({ apiKey });
  const program = body.gender === "boys" ? "mens" : "womens";
  const result = await findRosterUrl({
    schoolName,
    anthropic,
    model,
    program,
    sport: typeof body.sport === "string" ? body.sport : undefined,
  });
  return NextResponse.json(result);
}
