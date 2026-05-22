"use client";

import { useState } from "react";
import { BuyButton } from "@/components/BuyButton";

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
}

interface ApiResponse {
  monitoring: Monitoring;
  trigger: string;
  draft: DraftResult;
}

export function DemoForm() {
  const [firstName, setFirstName] = useState("");
  const [gradYear, setGradYear] = useState(2027);
  const [position, setPosition] = useState("M");
  const [club, setClub] = useState("");
  const [school, setSchool] = useState("williams");
  const [customSchool, setCustomSchool] = useState("");

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ApiResponse | null>(null);

  // A typed custom school routes to the live endpoint (find + scrape on the
  // fly). Otherwise we use the instant cached path for the popular schools.
  const isLive = customSchool.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !club.trim()) {
      setError("Please fill in first name and club.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError("");
    setResult(null);

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

  return (
    <div className="max-w-4xl mx-auto">
      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-5"
      >
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
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target school
          </label>
          <select
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            disabled={isLive}
            className="w-full rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 bg-white disabled:opacity-50"
          >
            {SCHOOLS.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-2">
            These {SCHOOLS.length} programs are pre-loaded so the demo runs in seconds. Or type any other college below and the agent will find and read it live.
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
            {isLive && (
              <p className="text-xs text-brand-700 mt-2">
                Live mode: the agent will find {customSchool.trim()}&apos;s roster and schedule and read them on the spot. Takes about 30-40 seconds. Clear this box to use the pre-loaded list instead.
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
                    Graduating spring 2026 ({result.monitoring.graduating_seniors.length})
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
              <div className="bg-gray-50 border-t border-gray-100 px-6 py-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled
                  className="bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg opacity-70 cursor-not-allowed"
                  title="Available to subscribers"
                >
                  Edit &amp; send via Gmail
                </button>
                <button
                  type="button"
                  disabled
                  className="bg-white border border-gray-200 text-sm text-gray-700 px-4 py-2 rounded-lg opacity-70 cursor-not-allowed"
                >
                  Re-draft
                </button>
                <button
                  type="button"
                  disabled
                  className="bg-white border border-gray-200 text-sm text-gray-700 px-4 py-2 rounded-lg opacity-70 cursor-not-allowed"
                >
                  Skip this week
                </button>
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
                    <div className="text-xs text-gray-500">to you · Sun May 17, 7:00 AM</div>
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
                    <li className="text-gray-500">• (plus changes at your other 11 tracked schools)</li>
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

          {/* CTA */}
          <div className="bg-brand-50 border border-brand-100 rounded-2xl p-8 text-center">
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
              Want this running every Sunday on your real target list?
            </h3>
            <p className="text-base text-gray-700 mb-6 max-w-2xl mx-auto leading-relaxed">
              Your athlete keeps playing, you keep being present at games, and the agent does the spreadsheet + email work in the background. Drafts land in your inbox. You approve and send via Gmail. $99/month, cancel anytime.
            </p>
            <div className="flex justify-center">
              <BuyButton />
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Secure checkout via Stripe. Cancel anytime, one click. Your first weekly digest arrives this Sunday at 7 AM Eastern.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
