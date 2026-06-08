"use client";

import { useState, useEffect } from "react";
import { BuyButton } from "@/components/BuyButton";
import { gmailComposeUrl } from "@/lib/gmailCompose";

const SCHOOLS = [
  { slug: "williams", name: "Williams College" },
  { slug: "amherst", name: "Amherst College" },
  { slug: "tufts", name: "Tufts University" },
  { slug: "bowdoin", name: "Bowdoin College" },
  { slug: "middlebury", name: "Middlebury College" },
  { slug: "wesleyan", name: "Wesleyan University" },
  { slug: "hamilton", name: "Hamilton College" },
  { slug: "trinity", name: "Trinity College" },
  { slug: "pomona-pitzer", name: "Pomona-Pitzer" },
  { slug: "carleton", name: "Carleton College" },
  { slug: "macalester", name: "Macalester College" },
  { slug: "vassar", name: "Vassar College" },
];

const GRAD_YEARS = [2027, 2028, 2029, 2030];

const YEARS_IN_COLLEGE = [
  { value: "Fr", label: "Freshman" },
  { value: "So", label: "Sophomore" },
  { value: "Jr", label: "Junior" },
  { value: "Sr", label: "Senior" },
  { value: "RS-Fr", label: "Redshirt Freshman" },
  { value: "RS-So", label: "Redshirt Sophomore" },
  { value: "RS-Jr", label: "Redshirt Junior" },
  { value: "RS-Sr", label: "Redshirt Senior" },
  { value: "Grad", label: "Graduate / 5th year" },
];

const PORTAL_OPTIONS = [
  { value: "yes", label: "Yes, in the transfer portal" },
  { value: "considering", label: "Considering / exploring" },
  { value: "no", label: "Not in the portal yet" },
];

// Stash demo athlete info so onboarding can pre-fill it after checkout
// (survives the Stripe redirect via localStorage on the same domain).
const DEMO_ATHLETE_KEY = "signday_demo_athlete";

// The next Sunday's date, for the "digest lands Sunday" mockup. Computed so the
// demo never shows a stale past date.
function upcomingSundayLabel(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() + (day === 0 ? 7 : 7 - day));
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const DIVISIONS = [
  { value: "D1", label: "D1" },
  { value: "D2", label: "D2" },
  { value: "D3", label: "D3" },
  { value: "NAIA", label: "NAIA" },
];

const POSITIONS = [
  { value: "GK", label: "Goalkeeper" },
  { value: "D", label: "Defender" },
  { value: "M", label: "Midfielder" },
  { value: "F", label: "Forward" },
];

type Status = "idle" | "loading" | "success" | "error";

interface GameResult {
  date: string;
  opponent: string;
  home_away?: string | null;
  result?: string | null;
  is_win?: boolean;
}

interface Monitoring {
  team: string;
  season: number;
  roster_size: number;
  head_coach: string | null;
  assistant_coaches: { name: string; title: string }[];
  position_counts: { GK: number; D: number; M: number; F: number };
  graduating_seniors: { name: string; position: string; class_year: string }[];
  record?: string | null;
  recent_results?: GameResult[];
  next_game?: { date: string; opponent: string; home_away?: string | null } | null;
}

interface DraftResult {
  subject: string;
  body: string;
  coach: string;
  school_name: string;
  draft_sig?: string | null;
}

// Mirrors lib/demoSign.ts DemoLeadPayload. Stored client-side and POSTed back
// verbatim (with its signature) when the prospect asks to be emailed the demo.
interface LeadPayload {
  school_name: string;
  subject: string;
  body: string;
  trigger: string;
  head_coach?: string | null;
  graduating_seniors?: { name: string; position: string; class_year: string }[];
  recent_results?: {
    result: string | null;
    opponent: string;
    date: string | null;
    is_win?: boolean;
  }[];
  record?: string | null;
}

interface ApiResponse {
  monitoring: Monitoring;
  trigger: string;
  draft: DraftResult;
  lead_payload?: LeadPayload;
  lead_sig?: string | null;
}

export function DemoForm() {
  const [firstName, setFirstName] = useState("");
  const [gradYear, setGradYear] = useState(2027);
  const [position, setPosition] = useState("M");
  const [club, setClub] = useState("");
  const [school, setSchool] = useState("williams");
  const [customSchool, setCustomSchool] = useState("");
  const [gender, setGender] = useState<"girls" | "boys">("girls");
  const [division, setDivision] = useState("D3");
  const [recruitType, setRecruitType] = useState<"high_school" | "transfer">(
    "high_school"
  );
  // Transfer-specific fields (only relevant when recruitType === "transfer")
  const [currentCollege, setCurrentCollege] = useState("");
  const [yearInCollege, setYearInCollege] = useState("So");
  const [inTransferPortal, setInTransferPortal] = useState<
    "yes" | "considering" | "no"
  >("considering");

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ApiResponse | null>(null);

  // Email-capture (lead) state: prospect can have their draft emailed to them.
  const [leadEmail, setLeadEmail] = useState("");
  const [leadStatus, setLeadStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [leadError, setLeadError] = useState("");

  // Anonymous feedback. Mode = which UI the user is in (tag pills or freetext
  // input). Status = the request lifecycle. Splitting them lets the freetext
  // input stay visible while a Send is in flight (status "sending" + mode
  // "freetext"), instead of flipping back to tags mid-request.
  const [feedback, setFeedback] = useState("");
  const [feedbackMode, setFeedbackMode] = useState<"tags" | "freetext">("tags");
  const [feedbackStatus, setFeedbackStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [feedbackError, setFeedbackError] = useState("");

  // Capture utm_source (e.g. from a Google ad) so demo runs are attributable
  // to ad vs organic in the admin dashboard.
  useEffect(() => {
    try {
      const src = new URLSearchParams(window.location.search).get("utm_source");
      if (src) localStorage.setItem("signday_src", src.slice(0, 40));
    } catch {
      /* ignore */
    }
  }, []);

  function getSource(): string {
    try {
      return localStorage.getItem("signday_src") || "direct";
    } catch {
      return "direct";
    }
  }

  // Boys always run live (our cached demo data is women's programs). A typed
  // custom school also routes to the live endpoint; otherwise the instant
  // cached path is used for the popular girls programs.
  const isLive = gender === "boys" || customSchool.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !club.trim()) {
      setError("Please fill in first name and club.");
      setStatus("error");
      return;
    }
    if (isLive && !customSchool.trim()) {
      setError(
        gender === "boys"
          ? "Type a school name to run (boys programs run live)."
          : "Type a school name to run live."
      );
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError("");
    setResult(null);
    setLeadStatus("idle");
    setLeadError("");
    setFeedback("");
    setFeedbackMode("tags");
    setFeedbackStatus("idle");
    setFeedbackError("");

    // Remember the athlete so onboarding can pre-fill it after they buy.
    try {
      localStorage.setItem(
        DEMO_ATHLETE_KEY,
        JSON.stringify({
          first_name: firstName.trim(),
          grad_year: gradYear,
          position,
          club: club.trim(),
          gender,
          division,
          recruit_type: recruitType,
          current_college: currentCollege.trim(),
          year_in_college: yearInCollege,
          in_transfer_portal: inTransferPortal,
        })
      );
    } catch {
      /* ignore */
    }

    // Transfer payload fields — only meaningful when recruitType === "transfer",
    // but harmless to include either way (the server ignores them otherwise).
    const transferFields =
      recruitType === "transfer"
        ? {
            current_college: currentCollege.trim(),
            year_in_college: yearInCollege,
            in_transfer_portal: inTransferPortal,
          }
        : {};

    try {
      const res = isLive
        ? await fetch("/api/demo-live", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              first_name: firstName.trim(),
              grad_year: gradYear,
              position,
              club: club.trim(),
              school_name: customSchool.trim(),
              gender,
              division,
              recruit_type: recruitType,
              ...transferFields,
              source: getSource(),
            }),
          })
        : await fetch("/api/demo-draft", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              first_name: firstName.trim(),
              grad_year: gradYear,
              position,
              club: club.trim(),
              school_slug: school,
              division,
              recruit_type: recruitType,
              ...transferFields,
              source: getSource(),
            }),
          });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Try again in a minute.");
        setStatus("error");
        return;
      }

      setResult(data);
      setStatus("success");
    } catch {
      setError("Network error. Try again in a minute.");
      setStatus("error");
    }
  }

  async function sendLead() {
    if (!result) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(leadEmail.trim())) {
      setLeadError("Please enter a valid email.");
      setLeadStatus("error");
      return;
    }
    setLeadStatus("sending");
    setLeadError("");
    try {
      const res = await fetch("/api/demo-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: leadEmail.trim(),
          first_name: firstName.trim(),
          source: getSource(),
          lead_payload: result.lead_payload,
          lead_sig: result.lead_sig,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLeadError(data.error || "Couldn't send. Try again in a minute.");
        setLeadStatus("error");
        return;
      }
      setLeadStatus("sent");
    } catch {
      setLeadError("Network error. Try again in a minute.");
      setLeadStatus("error");
    }
  }

  async function sendFeedback(rawText: string) {
    const text = rawText.trim();
    if (!text) {
      setFeedbackError("Please write a quick note first.");
      setFeedbackStatus("error");
      return;
    }
    setFeedbackStatus("sending");
    setFeedbackError("");
    try {
      const res = await fetch("/api/demo-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback: text,
          school_name: result?.draft.school_name,
          source: getSource(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedbackError(data.error || "Couldn't send. Try again in a minute.");
        setFeedbackStatus("error");
        return;
      }
      setFeedbackStatus("sent");
    } catch {
      setFeedbackError("Network error. Try again in a minute.");
      setFeedbackStatus("error");
    }
  }

  // Six pre-defined reasons for "not subscribing." Plus "Something else" which
  // flips to a freetext input. The label string is what gets stored, so /admin
  // is human-readable as-is and tags aggregate cleanly with a simple GROUP BY.
  const FEEDBACK_TAGS = [
    "Too expensive",
    "Don't trust it yet",
    "Want to wait and see",
    "My kid isn't recruiting age yet",
    "Already use something similar",
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Athlete
          </label>
          <div className="inline-flex rounded-xl border-2 border-gray-200 p-1">
            <button
              type="button"
              onClick={() => setRecruitType("high_school")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                recruitType === "high_school"
                  ? "bg-brand-600 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              High school recruit
            </button>
            <button
              type="button"
              onClick={() => setRecruitType("transfer")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                recruitType === "transfer"
                  ? "bg-brand-600 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              College transfer
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Same monitoring, different draft: transfer drafts read as a current college player, not a high school intro.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Soccer program
          </label>
          <div className="inline-flex rounded-xl border-2 border-gray-200 p-1">
            <button
              type="button"
              onClick={() => setGender("girls")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                gender === "girls"
                  ? "bg-brand-600 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Girls / Women&apos;s
            </button>
            <button
              type="button"
              onClick={() => setGender("boys")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                gender === "boys"
                  ? "bg-brand-600 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Boys / Men&apos;s
            </button>
          </div>
          {gender === "boys" && (
            <p className="text-xs text-gray-500 mt-2">
              Boys programs run live, so type the school below and the agent reads the men&apos;s roster on the spot.
            </p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Athlete first name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Maya"
              required
              className="w-full rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 placeholder-gray-400"
            />
          </div>
          {recruitType === "transfer" ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year in college
              </label>
              <select
                value={yearInCollege}
                onChange={(e) => setYearInCollege(e.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 bg-white"
              >
                {YEARS_IN_COLLEGE.map((y) => (
                  <option key={y.value} value={y.value}>
                    {y.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Graduation year
              </label>
              <select
                value={gradYear}
                onChange={(e) => setGradYear(Number(e.target.value))}
                className="w-full rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 bg-white"
              >
                {GRAD_YEARS.map((y) => (
                  <option key={y} value={y}>
                    Class of {y}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Position
            </label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 bg-white"
            >
              {POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          {recruitType === "transfer" ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current college
              </label>
              <input
                type="text"
                value={currentCollege}
                onChange={(e) => setCurrentCollege(e.target.value)}
                placeholder="Lehigh University"
                required
                className="w-full rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 placeholder-gray-400"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Club (with league)
              </label>
              <input
                type="text"
                value={club}
                onChange={(e) => setClub(e.target.value)}
                placeholder="Connecticut FC (ECNL)"
                required
                className="w-full rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 placeholder-gray-400"
              />
            </div>
          )}
        </div>

        {recruitType === "transfer" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transfer portal status
            </label>
            <select
              value={inTransferPortal}
              onChange={(e) =>
                setInTransferPortal(
                  e.target.value as "yes" | "considering" | "no"
                )
              }
              className="w-full rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 bg-white"
            >
              {PORTAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              Coaches read &ldquo;in the portal&rdquo; very differently from &ldquo;considering&rdquo;. The draft adapts.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target division
          </label>
          <select
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            className="w-full rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 bg-white"
          >
            {DIVISIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-2">
            The draft tunes to the division: academic-fit framing for D3, more athletic-profile-forward for D1 and D2.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target school
          </label>
          <select
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            disabled={gender === "boys"}
            className="w-full rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 bg-white disabled:opacity-50"
          >
            {SCHOOLS.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-2">
            {gender === "boys"
              ? `These ${SCHOOLS.length} presets are women's programs. For boys, type any school below and the agent reads the men's roster live.`
              : `These ${SCHOOLS.length} programs are pre-loaded so the demo runs in seconds. Or type any other college below and the agent will find and read it live.`}
          </p>

          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Or type any college (runs live)
            </label>
            <input
              type="text"
              value={customSchool}
              onChange={(e) => setCustomSchool(e.target.value)}
              placeholder="e.g. Spelman College, MIT, UC San Diego..."
              className="w-full rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 placeholder-gray-400"
            />
            {isLive && customSchool.trim() && (
              <p className="text-xs text-brand-700 mt-2">
                Live mode: the agent will find {customSchool.trim()}&apos;s{" "}
                {gender === "boys" ? "men's" : "women's"} roster and schedule and read them on the spot. Takes about 30-40 seconds.
                {gender === "girls" && " Clear this box to use the pre-loaded list instead."}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          {status === "loading"
            ? isLive
              ? "Finding and reading the school live (30-40 sec)..."
              : "Running the agent (10-15 sec)..."
            : isLive
            ? `Run the agent on ${customSchool.trim() || "this school"}`
            : "Run the agent on this school"}
        </button>

        {status === "error" && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </form>

      {/* Result: full agent walkthrough */}
      {result && status === "success" && (
        <div className="mt-12 space-y-10">
          {/* SECTION 1: Monitoring */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                Step 1 of 4
              </span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Monitoring
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
              What the agent watches at {result.monitoring.team}.
            </h2>
            <p className="text-sm text-gray-600 mb-5">
              Re-checked weekly. Anything that changes between Sundays becomes a signal.
            </p>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-100 px-6 py-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">
                  {result.monitoring.team}
                </div>
                <div className="text-xs text-gray-500">
                  {result.monitoring.season} season
                </div>
              </div>
              <div className="p-6 grid sm:grid-cols-2 gap-x-8 gap-y-5 text-sm">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Head Coach
                  </div>
                  <div className="text-gray-900">
                    {result.monitoring.head_coach || "Not listed"}
                  </div>
                  {result.monitoring.assistant_coaches.length > 0 && (
                    <div className="text-xs text-gray-500 mt-2">
                      Plus {result.monitoring.assistant_coaches.length} assistant{result.monitoring.assistant_coaches.length === 1 ? "" : "s"}:{" "}
                      {result.monitoring.assistant_coaches.map((c) => c.name).join(", ")}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Roster ({result.monitoring.roster_size} players)
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                      {result.monitoring.position_counts.GK} GK
                    </span>
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                      {result.monitoring.position_counts.D} D
                    </span>
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                      {result.monitoring.position_counts.M} M
                    </span>
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                      {result.monitoring.position_counts.F} F
                    </span>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Graduating seniors ({result.monitoring.graduating_seniors.length}) &middot; roster spots opening
                  </div>
                  {result.monitoring.graduating_seniors.length === 0 ? (
                    <div className="text-sm text-gray-500">No graduating seniors flagged on the current roster.</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {result.monitoring.graduating_seniors.map((p) => (
                        <span
                          key={p.name}
                          className="bg-orange-50 border border-orange-200 text-orange-800 text-xs px-2.5 py-1 rounded-full"
                        >
                          {p.name} ({p.position})
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {result.monitoring.recent_results &&
                  result.monitoring.recent_results.length > 0 && (
                    <div className="sm:col-span-2">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Recent results
                        {result.monitoring.record
                          ? ` (record ${result.monitoring.record})`
                          : ""}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {result.monitoring.recent_results.map((g, i) => (
                          <span
                            key={i}
                            className={`text-xs px-2.5 py-1 rounded-full border ${
                              g.is_win
                                ? "bg-green-50 border-green-200 text-green-800"
                                : "bg-gray-50 border-gray-200 text-gray-600"
                            }`}
                          >
                            {g.result ? `${g.result} ` : ""}
                            vs {g.opponent}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-gray-400 mt-2">
                        The agent re-reads the schedule weekly. A new win becomes a timely reason to reach out.
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* SECTION 2: Detection */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                Step 2 of 4
              </span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Detection
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
              Trigger surfaced this week.
            </h2>
            <p className="text-sm text-gray-600 mb-5">
              The agent compares this week&apos;s scrape to last week&apos;s, flags what&apos;s newly actionable, and queues an outreach.
            </p>

            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚡</span>
                <div className="text-sm text-orange-900 leading-relaxed">
                  {result.trigger}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Drafting */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                Step 3 of 4
              </span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Drafting
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
              Personalized coach email, ready for {firstName || "your athlete"} to approve.
            </h2>
            <p className="text-sm text-gray-600 mb-5">
              Pulled together from the trigger, the school&apos;s data, and your athlete&apos;s profile. No placeholders, no AI-template tells.
            </p>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gray-50 border-b border-gray-100 px-6 py-3 text-sm space-y-1">
                <div>
                  <span className="text-gray-500 inline-block w-16">To:</span>
                  <span className="text-gray-900">{result.draft.coach}</span>
                </div>
                <div>
                  <span className="text-gray-500 inline-block w-16">Subject:</span>
                  <span className="text-gray-900 font-semibold">{result.draft.subject}</span>
                </div>
              </div>
              <div className="p-6 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {result.draft.body}
              </div>
              <div className="bg-gray-50 border-t border-gray-100 px-6 py-3">
                <a
                  href={gmailComposeUrl({
                    subject: result.draft.subject,
                    body: result.draft.body,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Open in Gmail to edit &amp; send
                </a>
                <p className="text-xs text-gray-500 mt-2">
                  Opens Gmail with this draft ready. Add the coach&apos;s address, tweak it in your athlete&apos;s voice, and send. This is exactly what each Sunday digest gives you.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 4: Delivery */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                Step 4 of 4
              </span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Delivery
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
              And every Sunday, a digest like this lands in your inbox.
            </h2>
            <p className="text-sm text-gray-600 mb-5">
              One email, all your tracked schools, all the drafts waiting for your approval. Multiply this by every program on your list.
            </p>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 px-6 py-4 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
                    SD
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">SignDay Agent</div>
                    <div className="text-xs text-gray-500">to you · {upcomingSundayLabel()}, 7:00 AM</div>
                  </div>
                </div>
                <div className="mt-3 text-base font-semibold text-gray-900">
                  SignDay weekly digest: drafts ready for {firstName || "your athlete"}
                </div>
              </div>
              <div className="p-6 space-y-5 text-sm">
                <div>
                  <div className="font-semibold text-gray-900 mb-2">What changed this week:</div>
                  <ul className="space-y-1.5 text-gray-700 leading-relaxed">
                    <li>• {result.monitoring.team}: {result.trigger.slice(0, 110)}{result.trigger.length > 110 ? "..." : ""}</li>
                    <li className="text-gray-500">• (plus changes at your other tracked schools)</li>
                  </ul>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 mb-2">Drafts waiting for your approval:</div>
                  <ul className="space-y-1.5 text-gray-700 leading-relaxed">
                    <li>• {result.monitoring.team}: {result.draft.subject}</li>
                    <li className="text-gray-500">• (plus drafts for other schools with triggers this week)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Email me the full breakdown (lead capture) — prominent */}
          <div className="relative bg-gradient-to-br from-amber-50 via-white to-amber-50 border-2 border-amber-300 rounded-2xl p-6 md:p-8 shadow-md">
            <div className="absolute -top-3 left-6 bg-amber-500 text-white text-[11px] font-bold tracking-wider uppercase px-3 py-1 rounded-full shadow-sm">
              Take it with you
            </div>
            {leadStatus === "sent" ? (
              <div className="text-center py-2">
                <div className="text-3xl mb-2">📬</div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Sent. Check your inbox.</h3>
                <p className="text-sm text-gray-600">
                  The full {result.draft.school_name} breakdown for {firstName || "your athlete"} is on its way (give it a minute, and check spam if it&apos;s shy).
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                  Email me the full {result.draft.school_name} breakdown
                </h3>
                <p className="text-sm md:text-base text-gray-700 mb-5 leading-relaxed">
                  Get the whole 4-step report for {firstName || "your athlete"} in your inbox: what the agent watches, what it flagged this week, the draft, and the Sunday digest preview. No spam, just the one email.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
                  <input
                    type="email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="flex-1 rounded-xl border-2 border-amber-200 focus:border-amber-500 focus:outline-none px-4 py-3 text-base text-gray-900 placeholder-gray-400 bg-white"
                  />
                  <button
                    type="button"
                    onClick={sendLead}
                    disabled={leadStatus === "sending"}
                    className="bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl transition-colors whitespace-nowrap shadow-sm"
                  >
                    {leadStatus === "sending" ? "Sending..." : `Email me the ${result.draft.school_name} breakdown`}
                  </button>
                </div>
                {leadStatus === "error" && (
                  <p className="text-sm text-red-600 mt-2">{leadError}</p>
                )}
              </>
            )}
          </div>

          {/* Anonymous feedback — one-click tags with freetext fallback */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 md:p-6">
            {feedbackStatus === "sent" ? (
              <div className="text-center py-1">
                <div className="text-2xl mb-1">🙏</div>
                <p className="text-sm text-gray-700">
                  Thank you. Tony reads every one of these.
                </p>
              </div>
            ) : feedbackMode === "freetext" ? (
              <>
                <h4 className="text-base font-semibold text-gray-900 mb-2">
                  Tell me what&apos;s stopping you, in one line.
                </h4>
                <p className="text-xs text-gray-500 mb-3">Still anonymous.</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="In a sentence..."
                    maxLength={1000}
                    className="flex-1 rounded-lg border border-gray-300 focus:border-gray-500 focus:outline-none px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => sendFeedback(feedback)}
                    disabled={!feedback.trim() || feedbackStatus === "sending"}
                    className="bg-gray-800 hover:bg-gray-900 disabled:opacity-60 text-white font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap text-sm"
                  >
                    {feedbackStatus === "sending" ? "Sending..." : "Send"}
                  </button>
                </div>
                {feedbackStatus === "error" && (
                  <p className="text-xs text-red-600 mt-2">{feedbackError}</p>
                )}
              </>
            ) : (
              <>
                <h4 className="text-base font-semibold text-gray-900 mb-1">
                  Not subscribing? Tell me why.
                </h4>
                <p className="text-xs text-gray-500 mb-3">
                  One click, anonymous. I read every one — it&apos;s the most useful thing you can give me.
                </p>
                <div className="flex flex-wrap gap-2">
                  {FEEDBACK_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      disabled={feedbackStatus === "sending"}
                      onClick={() => sendFeedback(tag)}
                      className="bg-white border border-gray-300 hover:border-gray-500 hover:bg-gray-100 text-sm text-gray-800 px-3 py-2 rounded-full transition-colors disabled:opacity-50"
                    >
                      {tag}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={feedbackStatus === "sending"}
                    onClick={() => {
                      setFeedback("");
                      setFeedbackError("");
                      setFeedbackStatus("idle");
                      setFeedbackMode("freetext");
                    }}
                    className="bg-white border border-gray-300 hover:border-gray-500 hover:bg-gray-100 text-sm text-gray-700 px-3 py-2 rounded-full transition-colors disabled:opacity-50"
                  >
                    Something else…
                  </button>
                </div>
                {feedbackStatus === "error" && (
                  <p className="text-xs text-red-600 mt-2">{feedbackError}</p>
                )}
              </>
            )}
          </div>

          {/* CTA */}
          <div className="bg-brand-50 border border-brand-100 rounded-2xl p-8 text-center">
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
              Want this running every Sunday on your real target list?
            </h3>
            <p className="text-base text-gray-700 mb-5 max-w-2xl mx-auto leading-relaxed">
              Your athlete keeps playing, you keep being present at games, and the agent does the spreadsheet + email work in the background. Drafts land in your inbox. You approve and send via Gmail.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-6 text-sm">
              <span className="bg-white border border-brand-100 text-gray-700 px-3 py-1.5 rounded-full">$99/month</span>
              <span className="bg-white border border-brand-100 text-gray-700 px-3 py-1.5 rounded-full">Cancel anytime, one click</span>
              <span className="bg-white border border-brand-100 text-gray-700 px-3 py-1.5 rounded-full">No contract</span>
              <span className="bg-white border border-brand-100 text-gray-700 px-3 py-1.5 rounded-full">First digest {upcomingSundayLabel()}</span>
            </div>
            <div className="flex justify-center">
              <BuyButton />
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Secure checkout via Stripe. Your details from this demo carry over, so onboarding takes a minute.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
