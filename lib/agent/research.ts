import Anthropic from "@anthropic-ai/sdk";
import type { ResearchData } from "./types";

const SYSTEM_PROMPT = `You are a research assistant for a college soccer recruiting tool. Given a women's college soccer program, find RECENT, FACTUAL, citable news about it that an athlete could credibly reference in an outreach email to the coach.

Good material: recent game results or notable wins, recent commits the program announced, coaching staff news, conference honors, tournament runs, program milestones. All from roughly the last few weeks.

Do NOT invent anything. Only include items you can confirm from search results. If you find nothing recent and specific, return an empty items array.

Use web search. Then return your final answer as a single JSON object on its own line, no markdown fences, in this exact shape:
{
  "summary": "<1-2 sentence plain summary of the program's recent moment, or empty string>",
  "items": [
    { "headline": "<short factual headline>", "detail": "<one sentence of specifics>", "url": "<source url or null>" }
  ]
}

Cap items at 4. Return ONLY the JSON object as your final message.`;

function parseResearch(text: string): ResearchData | null {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();
  const tryParse = (s: string): ResearchData | null => {
    try {
      const obj = JSON.parse(s);
      if (obj && typeof obj === "object" && Array.isArray(obj.items)) {
        return obj as ResearchData;
      }
    } catch {
      /* ignore */
    }
    return null;
  };
  const direct = tryParse(stripped);
  if (direct) return direct;
  const match = stripped.match(/\{[\s\S]*"items"[\s\S]*\}/);
  if (match) return tryParse(match[0]);
  return null;
}

export interface ResearchOptions {
  schoolName: string;
  teamName?: string;
  anthropic: Anthropic;
  model: string;
}

// Best-effort recent-news research for one program. Used to enrich a draft we
// are already going to write (i.e. only called when a school has a trigger),
// never to create a trigger. Returns empty data on any failure so it can't
// break the run.
export async function researchSchool(
  opts: ResearchOptions
): Promise<ResearchData> {
  const empty: ResearchData = { summary: "", items: [] };
  try {
    const target = opts.teamName
      ? `${opts.teamName} (${opts.schoolName})`
      : opts.schoolName;
    const response = await opts.anthropic.messages.create({
      model: opts.model,
      max_tokens: 1500,
      temperature: 0,
      system: SYSTEM_PROMPT,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
      messages: [
        {
          role: "user",
          content: `Find recent, citable news about the women's soccer program at: ${target}`,
        },
      ],
    });
    const textBlocks = response.content.filter(
      (b) => b.type === "text"
    ) as { type: "text"; text: string }[];
    const finalText =
      textBlocks.length > 0 ? textBlocks[textBlocks.length - 1].text : "";
    return parseResearch(finalText) ?? empty;
  } catch (e) {
    console.error(
      `research failed for ${opts.schoolName}:`,
      e instanceof Error ? e.message : e
    );
    return empty;
  }
}
