import type {
  SchoolData,
  DiffOutput,
  PlayerChange,
  CoachChange,
  ScheduleData,
  GameResult,
} from "./types";

function indexBy<T>(items: T[], key: (item: T) => string): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    const k = key(item);
    // First occurrence wins; avoids collapsing distinct entries unpredictably.
    if (!map.has(k)) map.set(k, item);
  }
  return map;
}

// Normalize a person's name for identity comparison so cosmetic differences
// between two scrapes of the same page (accents, punctuation, middle initials,
// extra whitespace) don't register as a player/coach being added or removed.
function normName(s: string): string {
  const tokens = s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accent marks
    .replace(/[.,'’`-]/g, " ") // punctuation -> space
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((t) => t.length > 1); // drop single-char middle initials
  return tokens.join(" ");
}

// Normalize a coach title (e.g. "Head Coach" vs "head  coach").
function normTitle(s: string): string {
  return s.toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();
}

export function diffSchools(before: SchoolData, after: SchoolData): DiffOutput {
  const beforePlayers = indexBy(before.roster, (p) => normName(p.name));
  const afterPlayers = indexBy(after.roster, (p) => normName(p.name));

  const playersAdded: PlayerChange[] = [];
  for (const [key, player] of afterPlayers) {
    if (!beforePlayers.has(key)) {
      playersAdded.push({
        name: player.name, // original display name, not the normalized key
        position: player.position,
        class_year: player.class_year,
        jersey_number: player.jersey_number ?? null,
      });
    }
  }

  const playersRemoved: PlayerChange[] = [];
  for (const [key, player] of beforePlayers) {
    if (!afterPlayers.has(key)) {
      playersRemoved.push({
        name: player.name,
        position: player.position,
        class_year: player.class_year,
        jersey_number: player.jersey_number ?? null,
      });
    }
  }

  const beforeCoaches = indexBy(
    before.coaching_staff,
    (c) => `${normName(c.name)}|${normTitle(c.title)}`
  );
  const afterCoaches = indexBy(
    after.coaching_staff,
    (c) => `${normName(c.name)}|${normTitle(c.title)}`
  );

  const coachesAdded: CoachChange[] = [];
  for (const [key, coach] of afterCoaches) {
    if (!beforeCoaches.has(key)) {
      coachesAdded.push({ name: coach.name, title: coach.title });
    }
  }

  const coachesRemoved: CoachChange[] = [];
  for (const [key, coach] of beforeCoaches) {
    if (!afterCoaches.has(key)) {
      coachesRemoved.push({ name: coach.name, title: coach.title });
    }
  }

  const beforeHead = before.coaching_staff.find((c) =>
    /head coach/i.test(c.title)
  );
  const afterHead = after.coaching_staff.find((c) =>
    /head coach/i.test(c.title)
  );
  let headCoachChanged: { from: string; to: string } | null = null;
  if (
    beforeHead &&
    afterHead &&
    normName(beforeHead.name) !== normName(afterHead.name)
  ) {
    headCoachChanged = { from: beforeHead.name, to: afterHead.name };
  }

  const triggers: string[] = [];

  if (headCoachChanged) {
    triggers.push(
      `Head coach changed from ${headCoachChanged.from} to ${headCoachChanged.to}. Restart the outreach sequence.`
    );
  }

  for (const c of coachesAdded) {
    if (!/head coach/i.test(c.title) || !headCoachChanged) {
      triggers.push(`New coach added: ${c.name} (${c.title}).`);
    }
  }

  for (const c of coachesRemoved) {
    if (!/head coach/i.test(c.title) || !headCoachChanged) {
      triggers.push(`Coach left: ${c.name} (${c.title}).`);
    }
  }

  for (const p of playersAdded) {
    triggers.push(
      `New player on roster: ${p.name} (${p.position}, ${p.class_year}). Possible new commit.`
    );
  }

  for (const p of playersRemoved) {
    triggers.push(
      `Player removed from roster: ${p.name} (${p.position}, ${p.class_year}). Possible transfer or graduation.`
    );
  }

  return {
    team: after.team,
    generated_at: new Date().toISOString(),
    players_added: playersAdded,
    players_removed: playersRemoved,
    coaches_added: coachesAdded,
    coaches_removed: coachesRemoved,
    head_coach_changed: headCoachChanged,
    triggers,
  };
}

// Identity key for a played game, tolerant of formatting drift.
function resultKey(g: GameResult): string {
  return `${normTitle(g.date)}|${normName(g.opponent)}`;
}

export interface ScheduleDiff {
  triggers: string[];
  new_results: GameResult[];
}

// Detect newly-played games since last week. We only TRIGGER on wins, because
// a recent win is the most natural, non-creepy reason for an athlete to email
// a coach. Losses/ties are tracked but don't generate outreach.
export function diffSchedule(
  before: ScheduleData | null | undefined,
  after: ScheduleData | null | undefined
): ScheduleDiff {
  if (!after) return { triggers: [], new_results: [] };
  // First time we've seen a schedule for this school: baseline, no triggers.
  if (!before) return { triggers: [], new_results: [] };

  const beforeKeys = new Set(before.recent_results.map(resultKey));
  const newResults = after.recent_results.filter(
    (g) => !beforeKeys.has(resultKey(g))
  );

  const triggers: string[] = [];
  for (const g of newResults) {
    if (g.is_win) {
      const score = g.result || "a win";
      triggers.push(
        `Won ${score} vs ${g.opponent}${g.date ? ` (${g.date})` : ""}. A recent win is a strong, specific reason to reach out now.`
      );
    }
  }

  return { triggers, new_results: newResults };
}
