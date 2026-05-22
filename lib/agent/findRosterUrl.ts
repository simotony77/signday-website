import Anthropic from "@anthropic-ai/sdk";

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

export interface FindRosterResult {
  url: string | null;
  confidence: "high" | "medium" | "low";
  reason?: string;
}

function parseFinalJson(text: string): FindRosterResult | null {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();

  try {
    const obj = JSON.parse(stripped);
    if (obj && typeof obj === "object" && "url" in obj) {
      return obj as FindRosterResult;
    }
  } catch {
    /* ignore */
  }

  const match = stripped.match(/\{[\s\S]*"url"[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]) as FindRosterResult;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export interface FindRosterOptions {
  schoolName: string;
  anthropic: Anthropic;
  model: string;
}

// Find the women's soccer roster URL for a school name, using Claude's hosted
// web search tool. Returns { url: null } on failure rather than throwing.
export async function findRosterUrl(
  opts: FindRosterOptions
): Promise<FindRosterResult> {
  try {
    const response = await opts.anthropic.messages.create({
      model: opts.model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }],
      messages: [
        {
          role: "user",
          content: `Find the women's soccer roster URL for: ${opts.schoolName}`,
        },
      ],
    });

    const textBlocks = response.content.filter(
      (b) => b.type === "text"
    ) as { type: "text"; text: string }[];
    const finalText =
      textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text : "";

    return (
      parseFinalJson(finalText) ?? {
        url: null,
        confidence: "low",
        reason: "Could not parse search result.",
      }
    );
  } catch (e) {
    console.error(
      `findRosterUrl failed for ${opts.schoolName}:`,
      e instanceof Error ? e.message : e
    );
    return { url: null, confidence: "low", reason: "Search failed." };
  }
}
