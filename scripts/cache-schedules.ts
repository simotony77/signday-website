/**
 * Pre-cache schedule/results data for the demo schools so the public demo can
 * show real recent results instantly and reliably (no live scrape that could
 * fail mid-prospect). Re-run periodically to refresh.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... npx tsx scripts/cache-schedules.ts
 *
 * Writes data/schedules/<slug>.json for each school that scrapes successfully.
 */

import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { scrapeSchedule } from "../lib/agent/scrape";

const SCHOOLS: { slug: string; roster_url: string }[] = [
  { slug: "williams", roster_url: "https://ephsports.williams.edu/sports/womens-soccer/roster" },
  { slug: "amherst", roster_url: "https://athletics.amherst.edu/sports/womens-soccer/roster" },
  { slug: "tufts", roster_url: "https://gotuftsjumbos.com/sports/womens-soccer/roster" },
  { slug: "bowdoin", roster_url: "https://athletics.bowdoin.edu/sports/womens-soccer/roster" },
  { slug: "middlebury", roster_url: "https://athletics.middlebury.edu/sports/wsoc/roster" },
  { slug: "wesleyan", roster_url: "https://athletics.wesleyan.edu/sports/wsoc/roster" },
  { slug: "hamilton", roster_url: "https://athletics.hamilton.edu/sports/womens-soccer/roster" },
  { slug: "trinity", roster_url: "https://bantamsports.com/sports/wsoc/roster" },
  { slug: "pomona-pitzer", roster_url: "https://sagehens.com/sports/womens-soccer/roster" },
  { slug: "carleton", roster_url: "https://athletics.carleton.edu/sports/womens-soccer/roster" },
  { slug: "macalester", roster_url: "https://athletics.macalester.edu/sports/womens-soccer/roster" },
  { slug: "vassar", roster_url: "https://www.vassarathletics.com/sports/womens-soccer/roster" },
];

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[FATAL] ANTHROPIC_API_KEY required");
    process.exit(1);
  }
  const anthropic = new Anthropic({ apiKey });
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-5";
  const outDir = resolve(process.cwd(), "data", "schedules");
  mkdirSync(outDir, { recursive: true });

  let ok = 0;
  const failed: string[] = [];
  for (const s of SCHOOLS) {
    try {
      const schedule = await scrapeSchedule({ url: s.roster_url, anthropic, model });
      writeFileSync(
        resolve(outDir, `${s.slug}.json`),
        JSON.stringify(schedule, null, 2)
      );
      ok++;
      console.error(
        `OK  ${s.slug}: record ${schedule.record ?? "?"}, ${schedule.recent_results.length} recent results`
      );
    } catch (e) {
      failed.push(s.slug);
      console.error(`FAIL ${s.slug}: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.error(`\nDone. ${ok}/${SCHOOLS.length} cached. Failed: ${failed.join(", ") || "none"}`);
}

main().catch((e) => {
  console.error("[FATAL]", e instanceof Error ? e.message : e);
  process.exit(1);
});
