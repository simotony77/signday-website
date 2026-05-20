import Anthropic from "@anthropic-ai/sdk";
import TurndownService from "turndown";
import type { SchoolData } from "./types";

const EXTRACTION_PROMPT = `You are extracting a women's college soccer team roster from the page content below.

Return a single JSON object with this exact shape:

{
  "team": "<official team name>",
  "season": <year as number, e.g. 2025>,
  "roster": [
    {
      "name": "<full name>",
      "jersey_number": <number or null>,
      "position": "<GK | D | M | F | combinations like M/D>",
      "class_year": "<Fr | So | Jr | Sr | grad year like 2027>",
      "graduating": <true if this player is in their final season, otherwise false>,
      "captain": <true if explicitly noted, otherwise omit>
    }
  ],
  "coaching_staff": [
    { "name": "<full name>", "title": "<Head Coach | Assistant Coach | etc.>" }
  ],
  "seniors_graduating_next": ["<name>", "..."]
}

Rules:
- "graduating" = true for seniors (Sr) or anyone whose listed class year matches the season year + 0 (about to finish).
- For Williams-style listings ("1st" / "So" / "Jr" / "Sr"), "1st" = freshman (Fr).
- If the page lists no goalkeepers, still include the field.
- If jersey numbers are not shown, set to null.
- If position uses combinations (e.g. "M/D" or "F/M"), keep them as-is.
- Return ONLY the JSON object, no markdown fences, no commentary.

Page content:
---
`;

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

function htmlToMarkdown(html: string): string {
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });
  td.remove(["script", "style", "noscript"]);
  return td.turndown(html);
}

function trimContent(markdown: string, maxChars = 60_000): string {
  if (markdown.length <= maxChars) return markdown;
  return markdown.slice(0, maxChars) + "\n\n[...truncated]";
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();
}

export interface ScrapeOptions {
  url: string;
  anthropic: Anthropic;
  model: string;
}

export async function scrapeSchool(opts: ScrapeOptions): Promise<SchoolData> {
  const html = await fetchPage(opts.url);
  const markdown = trimContent(htmlToMarkdown(html));

  const response = await opts.anthropic.messages.create({
    model: opts.model,
    max_tokens: 4096,
    // Temperature 0 makes extraction near-deterministic. Critical: at the
    // default (1.0) the same page yields slightly different rosters each
    // run (middle initials, position notation), which the diff then reports
    // as phantom roster changes. We need stable reads for clean week-over-week
    // diffing.
    temperature: 0,
    messages: [
      {
        role: "user",
        content: EXTRACTION_PROMPT + markdown,
      },
    ],
  });

  const firstBlock = response.content[0];
  if (firstBlock.type !== "text") {
    throw new Error("Expected text response from Claude");
  }
  const jsonText = stripCodeFences(firstBlock.text);
  const data = JSON.parse(jsonText) as SchoolData;
  return data;
}
