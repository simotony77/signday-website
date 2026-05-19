import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are a research agent. Your job is to find the official URL of the WOMEN'S SOCCER ROSTER page for a US college.

The roster page is the page on the school's official athletics website that lists the current women's soccer team players (their names, positions, class years). It is NOT the schedule, news, coaching staff, or homepage.

Common URL patterns:
- https://athletics.<school>.edu/sports/womens-soccer/roster
- https://<school>athletics.com/sports/wsoc/roster
- https://goathletics.com/sports/womens-soccer/roster

Use web search to confirm. Verify the page actually lists player names before returning it.

Return your final answer as a single JSON object on its own line, no markdown fences, in this exact shape:
{ "url": "https://...", "confidence": "high" | "medium" | "low" }

If you cannot find a reliable roster page, return:
{ "url": null, "confidence": "low", "reason": "short reason" }

Do NOT return anything other than the JSON object as your final message.`;

interface FindRequest {
  school_name?: string;
}

interface FindResponse {
  url: string | null;
  confidence: "high" | "medium" | "low";
  reason?: string;
}

function parseFinalJson(text: string): FindResponse | null {
  // Try to find a JSON object in the text
  const trimmed = text.trim();
  // Strip code fences if present
  const stripped = trimmed
    .replace(/^```(?:json)?\s*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();

  // Try direct parse
  try {
    const obj = JSON.parse(stripped);
    if (obj && typeof obj === "object" && "url" in obj) {
      return obj as FindResponse;
    }
  } catch {
    // ignore
  }

  // Try to find a JSON object substring
  const match = stripped.match(/\{[\s\S]*"url"[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]) as FindResponse;
    } catch {
      // ignore
    }
  }

  return null;
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

  const schoolName = typeof body.school_name === "string" ? body.school_name.trim() : "";
  if (!schoolName) {
    return NextResponse.json({ error: "school_name required." }, { status: 400 });
  }
  if (schoolName.length > 100) {
    return NextResponse.json({ error: "school_name too long." }, { status: 400 });
  }

  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-5";
  const anthropic = new Anthropic({ apiKey });

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: [
        {
          // Anthropic's hosted web search tool
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 4,
        },
      ],
      messages: [
        {
          role: "user",
          content: `Find the women's soccer roster URL for: ${schoolName}`,
        },
      ],
    });

    // The final text answer should be the last text block in content[]
    // (after any tool_use / tool_result blocks)
    const textBlocks = response.content.filter((b) => b.type === "text") as {
      type: "text";
      text: string;
    }[];
    const finalText = textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text : "";

    const parsed = parseFinalJson(finalText);
    if (!parsed) {
      console.error("find-roster-url: could not parse model output", finalText);
      return NextResponse.json(
        { url: null, confidence: "low", reason: "Could not parse search result." },
        { status: 200 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("find-roster-url error:", err);
    return NextResponse.json(
      { url: null, confidence: "low", reason: "Search failed." },
      { status: 500 }
    );
  }
}
