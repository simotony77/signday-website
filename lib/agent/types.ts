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

// A school the agent tracks for a customer.
export interface TrackedSchool {
  name: string;
  roster_url: string;
}
