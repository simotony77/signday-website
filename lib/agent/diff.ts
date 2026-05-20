import type {
  SchoolData,
  DiffOutput,
  PlayerChange,
  CoachChange,
} from "./types";

function indexBy<T>(items: T[], key: (item: T) => string): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) map.set(key(item), item);
  return map;
}

export function diffSchools(before: SchoolData, after: SchoolData): DiffOutput {
  const beforePlayers = indexBy(before.roster, (p) => p.name);
  const afterPlayers = indexBy(after.roster, (p) => p.name);

  const playersAdded: PlayerChange[] = [];
  for (const [name, player] of afterPlayers) {
    if (!beforePlayers.has(name)) {
      playersAdded.push({
        name,
        position: player.position,
        class_year: player.class_year,
        jersey_number: player.jersey_number ?? null,
      });
    }
  }

  const playersRemoved: PlayerChange[] = [];
  for (const [name, player] of beforePlayers) {
    if (!afterPlayers.has(name)) {
      playersRemoved.push({
        name,
        position: player.position,
        class_year: player.class_year,
        jersey_number: player.jersey_number ?? null,
      });
    }
  }

  const beforeCoaches = indexBy(
    before.coaching_staff,
    (c) => `${c.name}|${c.title}`
  );
  const afterCoaches = indexBy(
    after.coaching_staff,
    (c) => `${c.name}|${c.title}`
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
  if (beforeHead && afterHead && beforeHead.name !== afterHead.name) {
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
