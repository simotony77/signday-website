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
  position: string;
  position_detail?: string;
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
