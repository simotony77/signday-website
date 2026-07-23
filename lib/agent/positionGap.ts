// Position-gap outlook: the headline signal of the weekly digest. For each
// tracked school, read the current roster and answer the one question a
// recruiting family actually has — "will there be room at my kid's position
// the year they arrive?" Snapshot-based (not week-over-week), so it renders
// every week, including quiet ones.

import type { SchoolData } from "./types";
import { matchesPosition, positionLabel, type SportConfig } from "./sports";

// Convert a roster class-year listing to an expected graduation (class-of)
// year. Athletics sites print either a code ("Sr", "Jr", "So", "Fr", "1st",
// "Gr", "R-So") or a year ("2027"). A senior playing the fall <season> season
// graduates the following spring, i.e. class of <season + 1>.
export function classToGradYear(classYear: string, season: number): number | null {
  const raw = (classYear || "").trim().toLowerCase();
  if (!raw) return null;

  const asNum = Number(raw);
  if (Number.isFinite(asNum) && asNum >= 2000 && asNum < 2100) return asNum;

  // Strip redshirt prefixes ("r-so", "rs so") — eligibility nuances don't
  // change the flag enough to matter at this granularity.
  const code = raw.replace(/^r(s)?[\s-]*/, "");
  if (/^(gr|grad|5th)/.test(code)) return season + 1;
  if (/^sr|^senior/.test(code)) return season + 1;
  if (/^jr|^junior/.test(code)) return season + 2;
  if (/^so|^soph/.test(code)) return season + 3;
  if (/^fr|^fresh|^1st/.test(code)) return season + 4;
  return null;
}

export interface PositionOutlook {
  note: string;
  // How many at-position players graduate on/before the athlete's arrival.
  leaving: number;
  total: number;
}

// Build the per-school position note. athleteGradYear is the HS class year —
// the athlete arrives on campus that fall, so any current player with a
// college class-of <= that year is gone (or leaving) when they arrive.
export function positionOutlook(
  school: SchoolData,
  sport: SportConfig,
  athletePosition: string,
  athleteGradYear: number
): PositionOutlook | null {
  if (!athletePosition || !athleteGradYear || athleteGradYear < 2000) return null;

  const season =
    Number.isFinite(school.season) && school.season >= 2000
      ? school.season
      : new Date().getFullYear();

  const atPosition = (school.roster || []).filter((p) =>
    matchesPosition(sport, athletePosition, p.position || "")
  );
  const label = positionLabel(sport, athletePosition).toLowerCase();

  if (atPosition.length === 0) {
    return {
      note: `No ${label}s listed on the current roster — often a sign the position is a recruiting priority.`,
      leaving: 0,
      total: 0,
    };
  }

  let leaving = 0;
  let unknown = 0;
  for (const p of atPosition) {
    const gy = classToGradYear(p.class_year, season);
    if (gy === null) {
      // Fall back to the extractor's graduating flag when the class year
      // didn't parse; treat a graduating player as leaving before arrival.
      if (p.graduating) leaving++;
      else unknown++;
      continue;
    }
    if (gy <= athleteGradYear) leaving++;
  }

  const plural = atPosition.length === 1 ? "" : "s";
  if (leaving > 0) {
    return {
      note:
        `${leaving} of ${atPosition.length} ${label}${plural} on the current roster ` +
        `graduate${leaving === 1 ? "s" : ""} by spring ${athleteGradYear} — ` +
        `the class your athlete would join. A spot should be opening.`,
      leaving,
      total: atPosition.length,
    };
  }

  return {
    note:
      `All ${atPosition.length} ${label}${plural} on the current roster are underclassmen through ` +
      `${athleteGradYear}${unknown > 0 ? " (some class years unclear)" : ""} — expect tighter competition for that entry year.`,
    leaving: 0,
    total: atPosition.length,
  };
}
