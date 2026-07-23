// Sport registry: every sport SignDay tracks, with the data the pipeline
// needs to stay sport-agnostic — URL slugs for roster discovery, position
// vocabulary for extraction and onboarding, and position-matching tokens for
// the grad-year gap flags. Pure data + tiny helpers; safe to import from
// client components.

export type SportId = "soccer" | "volleyball" | "baseball" | "softball" | "lacrosse";
export type AthleteGender = "boys" | "girls";

export interface SportPosition {
  value: string; // stored on the athlete profile, e.g. "GK"
  label: string; // shown in onboarding, e.g. "Goalkeeper"
  // Tokens matched (case-insensitively, whole-token) against the position
  // strings athletics sites print on rosters ("M/D", "RHP", "OH/DS", ...).
  match: string[];
}

export interface SportConfig {
  id: SportId;
  label: string; // "Soccer"
  genders: AthleteGender[]; // which college programs exist for this sport
  // Program display name per gender, e.g. girls -> "women's soccer".
  // Single-gender sports (baseball, softball) only carry their one entry.
  programNames: Partial<Record<AthleteGender, string>>;
  // Athletics-site URL slugs per gender, most common first. Used both to
  // suggest roster URLs and to generate alternate-URL retries.
  slugs: Partial<Record<AthleteGender, string[]>>;
  positions: SportPosition[];
  // Position vocabulary line for the roster-extraction prompt.
  positionWord: string;
  // Below this many players we treat a scrape as degraded/partial.
  minRoster: number;
  // Typical full-roster range, for prompts and error copy.
  typicalRoster: string;
}

export const SPORTS: Record<SportId, SportConfig> = {
  soccer: {
    id: "soccer",
    label: "Soccer",
    genders: ["girls", "boys"],
    programNames: { girls: "women's soccer", boys: "men's soccer" },
    slugs: {
      girls: ["womens-soccer", "wsoc"],
      boys: ["mens-soccer", "msoc"],
    },
    positions: [
      { value: "GK", label: "Goalkeeper", match: ["gk", "goalkeeper", "goalie", "k"] },
      { value: "D", label: "Defender", match: ["d", "def", "defender", "df", "b", "back", "cb", "lb", "rb"] },
      { value: "M", label: "Midfielder", match: ["m", "mid", "midfielder", "mf", "cm", "cdm", "cam"] },
      { value: "F", label: "Forward", match: ["f", "forward", "fw", "st", "striker", "w", "winger"] },
    ],
    positionWord: "GK | D | M | F | combinations like M/D",
    minRoster: 12,
    typicalRoster: "18-30",
  },
  volleyball: {
    id: "volleyball",
    label: "Volleyball",
    genders: ["girls"],
    programNames: { girls: "women's volleyball" },
    slugs: {
      girls: ["womens-volleyball", "wvball", "volleyball"],
    },
    positions: [
      { value: "S", label: "Setter", match: ["s", "setter"] },
      { value: "OH", label: "Outside Hitter", match: ["oh", "outside", "pin"] },
      { value: "MB", label: "Middle Blocker", match: ["mb", "mh", "middle"] },
      { value: "OPP", label: "Opposite / Right Side", match: ["opp", "opposite", "rs", "right"] },
      { value: "L", label: "Libero / Defensive Specialist", match: ["l", "lib", "libero", "ds", "defensive"] },
    ],
    positionWord: "S | OH | MB | OPP | L/DS | combinations like OH/DS",
    minRoster: 8,
    typicalRoster: "12-20",
  },
  baseball: {
    id: "baseball",
    label: "Baseball",
    genders: ["boys"],
    programNames: { boys: "baseball" },
    slugs: {
      boys: ["baseball", "bsb"],
    },
    positions: [
      { value: "P", label: "Pitcher", match: ["p", "rhp", "lhp", "pitcher"] },
      { value: "C", label: "Catcher", match: ["c", "catcher"] },
      { value: "IF", label: "Infielder", match: ["if", "inf", "infielder", "1b", "2b", "3b", "ss", "mif", "cif"] },
      { value: "OF", label: "Outfielder", match: ["of", "outfielder", "cf", "lf", "rf"] },
      { value: "UTL", label: "Utility / DH", match: ["utl", "ut", "util", "utility", "dh"] },
    ],
    positionWord: "RHP | LHP | C | IF | OF | UTL | specific spots like SS or CF",
    minRoster: 20,
    typicalRoster: "30-45",
  },
  softball: {
    id: "softball",
    label: "Softball",
    genders: ["girls"],
    programNames: { girls: "softball" },
    slugs: {
      girls: ["softball", "sball"],
    },
    positions: [
      { value: "P", label: "Pitcher", match: ["p", "rhp", "lhp", "pitcher"] },
      { value: "C", label: "Catcher", match: ["c", "catcher"] },
      { value: "IF", label: "Infielder", match: ["if", "inf", "infielder", "1b", "2b", "3b", "ss", "mif"] },
      { value: "OF", label: "Outfielder", match: ["of", "outfielder", "cf", "lf", "rf"] },
      { value: "UTL", label: "Utility / DP", match: ["utl", "ut", "util", "utility", "dp"] },
    ],
    positionWord: "P | C | IF | OF | UTL | specific spots like SS or CF",
    minRoster: 12,
    typicalRoster: "18-25",
  },
  lacrosse: {
    id: "lacrosse",
    label: "Lacrosse",
    genders: ["girls", "boys"],
    programNames: { girls: "women's lacrosse", boys: "men's lacrosse" },
    slugs: {
      girls: ["womens-lacrosse", "wlax"],
      boys: ["mens-lacrosse", "mlax"],
    },
    positions: [
      { value: "G", label: "Goalie", match: ["g", "gk", "goalie", "goalkeeper"] },
      { value: "D", label: "Defense", match: ["d", "def", "defense", "defender", "lsm", "cd"] },
      { value: "M", label: "Midfield", match: ["m", "mid", "midfield", "midfielder", "ssdm", "fogo"] },
      { value: "A", label: "Attack", match: ["a", "att", "attack", "attacker"] },
    ],
    positionWord: "G | D | M | A | specialist roles like LSM or FOGO",
    minRoster: 15,
    typicalRoster: "25-45",
  },
};

export const SPORT_IDS = Object.keys(SPORTS) as SportId[];

export function isSportId(v: unknown): v is SportId {
  return typeof v === "string" && v in SPORTS;
}

// Resolve a stored sport value to its config. Anything missing or unknown
// falls back to soccer — every athlete record created before sport existed
// is a soccer athlete.
export function getSport(id: unknown): SportConfig {
  return isSportId(id) ? SPORTS[id] : SPORTS.soccer;
}

// Clamp a gender to one the sport actually fields (e.g. a "boys" athlete
// switching the form to volleyball becomes "girls" — the only program).
export function clampGender(sport: SportConfig, gender: AthleteGender): AthleteGender {
  return sport.genders.includes(gender) ? gender : sport.genders[0];
}

// "women's volleyball", "baseball", ... for a given athlete gender.
export function programName(sport: SportConfig, gender: AthleteGender): string {
  return (
    sport.programNames[clampGender(sport, gender)] ?? sport.label.toLowerCase()
  );
}

// Does a roster position string (e.g. "M/D", "RHP", "OH/DS") cover the
// athlete's chosen position? Token-based so combined listings still match.
export function matchesPosition(
  sport: SportConfig,
  positionValue: string,
  rosterPosition: string
): boolean {
  const pos = sport.positions.find((p) => p.value === positionValue);
  if (!pos) return false;
  const tokens = rosterPosition
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return tokens.some((t) => pos.match.includes(t));
}

export function positionLabel(sport: SportConfig, value: string): string {
  return sport.positions.find((p) => p.value === value)?.label ?? value;
}
