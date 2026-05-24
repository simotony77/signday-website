import Anthropic from "@anthropic-ai/sdk";
import TurndownService from "turndown";
import type { SchoolData, ScheduleData } from "./types";

const EXTRACTION_PROMPT = `You are extracting a college soccer team roster from the page content below. The page may be a men's or a women's program; extract whichever roster is shown.

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

// Full set of headers a real Chrome request sends. Gets past UA-only blocks.
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

// Generate alternate URLs to try if the given one fails (wrong season path,
// wsoc vs womens-soccer naming, etc.).
function altUrls(url: string): string[] {
  const out = new Set<string>();
  // Drop a season segment like /2025-26/ or /2025/
  const noSeason = url.replace(/\/(19|20)\d{2}(-\d{2})?(?=\/)/g, "");
  if (noSeason !== url) out.add(noSeason);
  // Swap common sport-slug spellings, with and without season.
  for (const base of [url, noSeason]) {
    if (base.includes("/wsoc/"))
      out.add(base.replace("/wsoc/", "/womens-soccer/"));
    if (base.includes("/womens-soccer/"))
      out.add(base.replace("/womens-soccer/", "/wsoc/"));
  }
  out.delete(url);
  return [...out];
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

// Reject URLs that could be used for SSRF (non-http(s), localhost, private or
// link-local hosts). Roster/schedule pages are always public https sites.
function assertSafeUrl(url: string): void {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error("Invalid URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed");
  }
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) || // link-local (incl. cloud metadata 169.254.169.254)
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^(fc|fd)[0-9a-f]{2}:/i.test(host) || // unique local IPv6
    /^fe80:/i.test(host) // link-local IPv6
  ) {
    throw new Error("URL host is not allowed");
  }
}

// Plain fetch + Turndown. Returns markdown, or throws on a blocked / empty page.
async function fetchAsMarkdown(url: string): Promise<string> {
  assertSafeUrl(url);
  const res = await fetch(url, {
    headers: BROWSER_HEADERS,
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  // Bot-protected sites often return 200/202 with an empty or tiny body.
  if (html.trim().length < 500) {
    throw new Error(`Empty/blocked response (${html.trim().length} bytes)`);
  }
  return htmlToMarkdown(html);
}

// Rendering fallback: Firecrawl executes JS + bypasses bot challenges and
// returns clean markdown. Only used if FIRECRAWL_API_KEY is set.
async function firecrawlAsMarkdown(url: string): Promise<string> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("no FIRECRAWL_API_KEY");
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
      timeout: 45000,
    }),
  });
  if (!res.ok) {
    throw new Error(`Firecrawl failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as {
    success?: boolean;
    data?: { markdown?: string };
  };
  const md = data?.data?.markdown;
  if (!md || md.trim().length < 200) {
    throw new Error("Firecrawl returned empty markdown");
  }
  return md;
}

// Get roster page content as markdown. Tries the URL and a few sensible
// variants with plain fetch, then falls back to Firecrawl rendering (if a
// key is configured) for JS-protected sites.
async function getPageMarkdown(url: string): Promise<string> {
  assertSafeUrl(url); // also covers the Firecrawl fallback below
  const candidates = [url, ...altUrls(url)];
  let lastErr: unknown;

  for (const candidate of candidates) {
    try {
      return await fetchAsMarkdown(candidate);
    } catch (e) {
      lastErr = e;
    }
  }

  // Plain fetch failed for every candidate. Try the rendering service.
  if (process.env.FIRECRAWL_API_KEY) {
    try {
      return await firecrawlAsMarkdown(url);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

const SCHEDULE_PROMPT = `You are extracting a college soccer team's SCHEDULE and RESULTS from the page content below. The page may be a men's or a women's program.

Return a single JSON object with this exact shape:

{
  "team": "<official team name>",
  "season": <year as number, e.g. 2025>,
  "record": "<overall record like 8-2-1, or null if not shown>",
  "recent_results": [
    {
      "date": "<date as listed>",
      "opponent": "<opponent name>",
      "home_away": "<H | A | N or null>",
      "result": "<W 4-1 | L 0-2 | T 1-1, exactly as the team's result, or null if not played>",
      "is_win": <true only if this team won, else false>
    }
  ],
  "upcoming": [
    { "date": "<date>", "opponent": "<opponent>", "home_away": "<H | A | N or null>" }
  ]
}

Rules:
- recent_results: ONLY games that have already been played and have a final score. Most recent first. Cap at 8.
- "is_win" is true ONLY when THIS team won (not the opponent). Read the score from this team's perspective.
- "result" should read from this team's side: a 4-1 win is "W 4-1", a 0-2 loss is "L 0-2".
- upcoming: ONLY future games with no score yet. Cap at 5.
- If the page shows no played games, return an empty recent_results array.
- Return ONLY the JSON object, no markdown fences, no commentary.

Page content:
---
`;

// Derive likely schedule-page URLs from a roster URL. Most college athletics
// sites mirror the path: /sports/womens-soccer/roster -> /.../schedule.
function scheduleUrlCandidates(rosterUrl: string): string[] {
  const out = new Set<string>();
  if (/roster\/?$/.test(rosterUrl)) {
    out.add(rosterUrl.replace(/roster\/?$/, "schedule"));
    out.add(rosterUrl.replace(/roster\/?$/, "schedule/"));
  }
  // Also try swapping a /roster/ segment that isn't at the end.
  if (rosterUrl.includes("/roster/")) {
    out.add(rosterUrl.replace("/roster/", "/schedule/"));
  }
  out.delete(rosterUrl);
  return [...out];
}

export interface ScrapeOptions {
  url: string;
  anthropic: Anthropic;
  model: string;
}

// Scrape a school's schedule/results. Derives the schedule URL from the
// roster URL. Returns null-throwing on failure so callers can treat schedule
// as best-effort (roster monitoring still works without it).
export async function scrapeSchedule(opts: ScrapeOptions): Promise<ScheduleData> {
  const candidates = scheduleUrlCandidates(opts.url);
  if (candidates.length === 0) {
    throw new Error("could not derive a schedule URL from roster URL");
  }

  let markdown: string | null = null;
  let lastErr: unknown;
  for (const url of candidates) {
    try {
      markdown = trimContent(await getPageMarkdown(url));
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (markdown == null) {
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  const response = await opts.anthropic.messages.create({
    model: opts.model,
    max_tokens: 3000,
    temperature: 0,
    messages: [{ role: "user", content: SCHEDULE_PROMPT + markdown }],
  });
  const firstBlock = response.content[0];
  if (firstBlock.type !== "text") {
    throw new Error("Expected text response from Claude");
  }
  return JSON.parse(stripCodeFences(firstBlock.text)) as ScheduleData;
}

// Normalize a name for de-duplication (some athletics pages render the roster
// twice, so the model extracts each player multiple times).
export function normNameKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.,'’`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function dedupeRoster(data: SchoolData): SchoolData {
  const seenP = new Set<string>();
  const roster = [];
  for (const p of data.roster || []) {
    const k = normNameKey(p.name || "");
    if (k && !seenP.has(k)) {
      seenP.add(k);
      roster.push(p);
    }
  }
  const seenC = new Set<string>();
  const coaching_staff = [];
  for (const c of data.coaching_staff || []) {
    const k = `${normNameKey(c.name || "")}|${(c.title || "").toLowerCase().trim()}`;
    if (!seenC.has(k)) {
      seenC.add(k);
      coaching_staff.push(c);
    }
  }
  return { ...data, roster, coaching_staff };
}

// A real college soccer roster is ~18-30 players. Below this we treat the read
// as degraded (partial/blocked page) rather than a real, shrunken roster.
export const MIN_ROSTER = 12;

async function extractRosterOnce(
  opts: ScrapeOptions,
  markdown: string
): Promise<SchoolData> {
  const response = await opts.anthropic.messages.create({
    model: opts.model,
    max_tokens: 4096,
    // Temperature 0 makes extraction near-deterministic. Critical: at the
    // default (1.0) the same page yields slightly different rosters each
    // run (middle initials, position notation), which the diff then reports
    // as phantom roster changes.
    temperature: 0,
    messages: [{ role: "user", content: EXTRACTION_PROMPT + markdown }],
  });
  const firstBlock = response.content[0];
  if (firstBlock.type !== "text") {
    throw new Error("Expected text response from Claude");
  }
  return dedupeRoster(JSON.parse(stripCodeFences(firstBlock.text)) as SchoolData);
}

// Scrape a roster, guarding against the degraded/partial reads some athletics
// sites intermittently serve (which would otherwise produce huge false diffs).
// We re-fetch and re-extract up to 3 times and keep the most complete read.
// If we never get a plausibly-complete roster, we throw so the caller skips the
// school this week instead of inventing roster changes.
export async function scrapeSchool(opts: ScrapeOptions): Promise<SchoolData> {
  let best: SchoolData | null = null;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const markdown = trimContent(await getPageMarkdown(opts.url));
      const data = await extractRosterOnce(opts, markdown);
      if (data.roster.length >= MIN_ROSTER) return data;
      if (!best || data.roster.length > best.roster.length) best = data;
    } catch (e) {
      lastErr = e;
    }
  }
  if (best && best.roster.length > 0) {
    throw new Error(
      `Roster read incomplete (${best.roster.length} players after retries) — likely a partial/blocked page`
    );
  }
  throw lastErr instanceof Error ? lastErr : new Error("scrape failed");
}
