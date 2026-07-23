// Shared agent types. Ported from signday-agent/src/lib/types.ts so the
// website can run the same scrape -> diff -> draft pipeline server-side.

export interface Player {
  name: string;
  jersey_number?: number | null;
  position: string;
  class_year: string;
  graduating?: boolean;
  captain?: boolean;
}

export interface Coach {
  name: string;
  title: string;
  email?: string | null; // only set when listed verbatim on the page
}

export interface SchoolData {
  team: string;
  season: number;
  roster: Player[];
  coaching_staff: Coach[];
  seniors_graduating_next?: string[];
}

export interface AthleteProfile {
  first_name: string;
  last_name: string;
  grad_year: number;
  // Which sport this athlete plays. Absent on records created before
  // multi-sport support; readers default to "soccer" via getSport().
  sport?: string;
  position: string;
  position_detail?: string;
  // "boys" tracks men's college programs; "girls" tracks women's. Defaults to
  // girls for backward compatibility with existing data.
  gender?: "boys" | "girls";
  current_league?: string;
  division?: string;
  club: string;
  country?: string;
  state?: string;
  gpa: number | null;
  sat?: number | null;
  act?: number | null;
  test_score?: number | null;
  intended_majors?: string[];
  playing_style?: string;
  strengths?: string[];
  video_url?: string;
  reel_url?: string;
  email: string;
  next_us_window?: string;
  // Optional: the athlete's next ID camp / showcase, for a time-sensitive
  // countdown nudge in the weekly digest.
  next_camp_name?: string;
  next_camp_date?: string; // ISO date string (yyyy-mm-dd)
  // "high_school" = a HS recruit reaching out to college coaches (default).
  // "transfer" = a current college player looking to move to another program.
  // Same monitoring mechanic; the drafter switches framing accordingly.
  recruit_type?: "high_school" | "transfer";

  // ---- Transfer-specific fields (used when recruit_type === "transfer") ----
  // The program they currently play at, e.g. "Lehigh University".
  current_college?: string;
  // Year in college as a short code: "Fr" | "So" | "Jr" | "Sr" | "RS-Fr" |
  // "RS-So" | "RS-Jr" | "RS-Sr" | "Grad". Stored as a free string so we don't
  // have to backfill enums when terminology shifts.
  year_in_college?: string;
  // Where they are in the transfer process. "yes" = in the NCAA transfer
  // portal; "considering" = exploring but not yet entered; "no" = not in
  // portal (some private discussions only). Coaches read this very differently.
  in_transfer_portal?: "yes" | "considering" | "no";
  // Years of eligibility remaining (1, 2, 3, sometimes 4). Coaches need this
  // to know how long the athlete could be with their program.
  years_eligibility_remaining?: number;
  // Short candid reason for transferring (e.g. "looking for more playing time",
  // "system fit", "coaching change", "academic move"). Used to shape one tactful
  // line in the draft — never quoted verbatim.
  reason_for_transfer?: string;
}

export interface PlayerChange {
  name: string;
  position: string;
  class_year: string;
  jersey_number?: number | null;
}

export interface CoachChange {
  name: string;
  title: string;
}

export interface DiffOutput {
  team: string;
  generated_at: string;
  players_added: PlayerChange[];
  players_removed: PlayerChange[];
  coaches_added: CoachChange[];
  coaches_removed: CoachChange[];
  head_coach_changed: { from: string; to: string } | null;
  triggers: string[];
}

export interface Draft {
  subject: string;
  body: string;
}

// ---- Schedule / results ----

export interface GameResult {
  date: string; // as listed on the page
  opponent: string;
  home_away?: string | null; // "H" | "A" | "N"
  result?: string | null; // "W 4-1" | "L 0-2" | "T 1-1"
  is_win?: boolean;
}

export interface UpcomingGame {
  date: string;
  opponent: string;
  home_away?: string | null;
}

export interface ScheduleData {
  team: string;
  season: number;
  record?: string | null; // "8-2-1"
  recent_results: GameResult[]; // most recent first
  upcoming: UpcomingGame[];
}

// ---- Research (web) ----

export interface ResearchItem {
  headline: string;
  detail: string;
  url?: string | null;
}

export interface ResearchData {
  summary: string;
  items: ResearchItem[];
}

// ---- Combined weekly snapshot stored per (customer, school) ----
// Older snapshots stored just the SchoolData; readers normalize both shapes.
export interface SchoolSnapshot {
  school: SchoolData;
  schedule?: ScheduleData | null;
}

// A school the agent tracks for a customer.
export interface TrackedSchool {
  name: string;
  roster_url: string;
}
