import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { findRosterUrl } from "@/lib/agent/findRosterUrl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface FindRequest {
  school_name?: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server not configured (missing ANTHROPIC_API_KEY)." },
      { status: 500 }
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
  const result = await findRosterUrl({ schoolName, anthropic, model });
  return NextResponse.json(result);
}
