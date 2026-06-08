"use client";

import { useState, useEffect } from "react";

const POSITIONS = [
  { value: "GK", label: "Goalkeeper" },
  { value: "D", label: "Defender" },
  { value: "M", label: "Midfielder" },
  { value: "F", label: "Forward" },
];

// Youth leagues the athlete currently plays in. Coaches use league as a quick
// signal of competitive level. The top leagues differ by gender: ECNL/GA for
// girls, MLS Next/ECNL Boys for boys.
const GIRLS_LEAGUES = [
  { value: "ECNL", label: "ECNL" },
  { value: "GA", label: "Girls Academy (GA)" },
  { value: "ECNL-RL", label: "ECNL Regional League (ECRL)" },
  { value: "NPL", label: "NPL" },
  { value: "NL", label: "National League" },
  { value: "USL_ACADEMY", label: "USL Academy" },
  { value: "STATE", label: "State League" },
  { value: "HS_ONLY", label: "High school only" },
  { value: "OTHER", label: "Other (explain in notes)" },
];

const BOYS_LEAGUES = [
  { value: "MLS_NEXT", label: "MLS Next" },
  { value: "ECNL_BOYS", label: "ECNL Boys" },
  { value: "USL_ACADEMY", label: "USL Academy" },
  { value: "NAL", label: "National Academy League (NAL)" },
  { value: "NPL", label: "NPL" },
  { value: "NL", label: "National League" },
  { value: "STATE", label: "State League" },
  { value: "HS_ONLY", label: "High school only" },
  { value: "OTHER", label: "Other (explain in notes)" },
];

const DIVISIONS = [
  { value: "D1", label: "D1 only" },
  { value: "D2", label: "D2 only" },
  { value: "D3", label: "D3 only" },
  { value: "NAIA", label: "NAIA only" },
  { value: "D1+D2", label: "D1 and D2" },
  { value: "D3+D2", label: "D3 and D2" },
  { value: "D3+D1", label: "D3 and D1 (low-major / Ivy)" },
  { value: "D3+NAIA", label: "D3 and NAIA" },
  { value: "Other", label: "Other / mixed (explain in notes)" },
];

// Set by the public demo so a new customer doesn't retype what they just
// entered. Real saved-submission data (loaded below) always wins over this.
const DEMO_ATHLETE_KEY = "signday_demo_athlete";

type Status = "idle" | "submitting" | "success" | "error";

type LookupStatus = "idle" | "looking" | "found" | "failed";

interface SchoolRow {
  name: string;
  roster_url: string;
}

function emptyRow(): SchoolRow {
  return { name: "", roster_url: "" };
}

export function OnboardingForm({
  initialEmail = "",
  token = "",
}: {
  initialEmail?: string;
  token?: string;
}) {
  // Athlete fields
  const [email, setEmail] = useState(initialEmail);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gradYear, setGradYear] = useState(2027);
  const [position, setPosition] = useState("M");
  const [gender, setGender] = useState<"girls" | "boys">("girls");
  const [recruitType, setRecruitType] = useState<"high_school" | "transfer">(
    "high_school"
  );
  const [currentLeague, setCurrentLeague] = useState("ECNL");
  const [division, setDivision] = useState("D3");
  const [club, setClub] = useState("");
  const [gpa, setGpa] = useState("");
  const [testScore, setTestScore] = useState("");
  const [reelUrl, setReelUrl] = useState("");
  const [athleteEmail, setAthleteEmail] = useState("");
  const [campName, setCampName] = useState("");
  const [campDate, setCampDate] = useState("");
  const [notes, setNotes] = useState("");

  // Schools — start with 12 empty rows
  const [schools, setSchools] = useState<SchoolRow[]>(
    Array.from({ length: 12 }, emptyRow)
  );
  const [lookupStates, setLookupStates] = useState<LookupStatus[]>(
    Array.from({ length: 12 }, () => "idle")
  );
  const [lookupNotes, setLookupNotes] = useState<string[]>(
    Array.from({ length: 12 }, () => "")
  );

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  // Existing-submission flag: switches button label + success copy from
  // "Finish onboarding" to "Save changes" once we've loaded prior data.
  const [isUpdate, setIsUpdate] = useState(false);

  // Pre-fill from the demo the prospect just ran (if any). Runs first; the
  // async saved-submission load below overrides it when real data exists.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DEMO_ATHLETE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (typeof d.first_name === "string" && d.first_name) setFirstName(d.first_name);
      if (typeof d.grad_year === "number") setGradYear(d.grad_year);
      if (typeof d.position === "string" && d.position) setPosition(d.position);
      if (typeof d.club === "string" && d.club) setClub(d.club);
      if (d.gender === "boys" || d.gender === "girls") {
        setGender(d.gender);
        // Match the league default to the gender so a girls-only league isn't
        // left selected for a boys athlete (mirrors the gender onChange).
        setCurrentLeague(d.gender === "boys" ? "MLS_NEXT" : "ECNL");
      }
      if (typeof d.division === "string" && d.division) setDivision(d.division);
      if (d.recruit_type === "transfer" || d.recruit_type === "high_school")
        setRecruitType(d.recruit_type);
    } catch {
      /* ignore */
    }
  }, []);

  // On mount, if we have an initial email, try to load an existing onboarding
  // submission for that customer and prefill the form. Lets paying customers
  // come back and update their athlete + school list any time.
  useEffect(() => {
    const e = initialEmail.trim().toLowerCase();
    if (!e) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/onboarding/load?email=${encodeURIComponent(e)}&token=${encodeURIComponent(token)}`,
          { method: "GET" }
        );
        if (!res.ok) return;
        const data = await res.json();
        const sub = data?.submission;
        if (cancelled || !sub) return;

        const a = sub.athlete || {};
        if (typeof a.first_name === "string") setFirstName(a.first_name);
        if (typeof a.last_name === "string") setLastName(a.last_name);
        if (typeof a.grad_year === "number") setGradYear(a.grad_year);
        if (typeof a.position === "string") setPosition(a.position);
        if (a.gender === "boys" || a.gender === "girls") setGender(a.gender);
        if (a.recruit_type === "transfer" || a.recruit_type === "high_school")
          setRecruitType(a.recruit_type);
        if (typeof a.current_league === "string") setCurrentLeague(a.current_league);
        if (typeof a.division === "string") setDivision(a.division);
        if (typeof a.club === "string") setClub(a.club);
        if (typeof a.gpa === "number") setGpa(String(a.gpa));
        if (typeof a.test_score === "number") setTestScore(String(a.test_score));
        if (typeof a.reel_url === "string") setReelUrl(a.reel_url || "");
        if (typeof a.email === "string") setAthleteEmail(a.email);
        if (typeof a.next_camp_name === "string") setCampName(a.next_camp_name);
        if (typeof a.next_camp_date === "string") setCampDate(a.next_camp_date);

        const savedSchools = Array.isArray(sub.schools) ? sub.schools : [];
        if (savedSchools.length > 0) {
          // Show at least 12 rows so they have empty slots to add more.
          const padded: SchoolRow[] = [
            ...savedSchools.map((s: { name?: string; roster_url?: string }) => ({
              name: s.name || "",
              roster_url: s.roster_url || "",
            })),
            ...Array.from({ length: Math.max(0, 12 - savedSchools.length) }, emptyRow),
          ];
          setSchools(padded);
          setLookupStates(padded.map((s) => (s.roster_url ? "found" : "idle")));
          setLookupNotes(padded.map(() => ""));
        }

        if (typeof sub.notes === "string") setNotes(sub.notes);
        setIsUpdate(true);
      } catch {
        // Silent fail — form just stays empty
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialEmail, token]);

  function updateSchool(index: number, field: keyof SchoolRow, value: string) {
    setSchools((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function setLookup(index: number, state: LookupStatus, note: string = "") {
    setLookupStates((prev) => {
      const next = [...prev];
      next[index] = state;
      return next;
    });
    setLookupNotes((prev) => {
      const next = [...prev];
      next[index] = note;
      return next;
    });
  }

  async function findUrlFor(index: number) {
    const name = schools[index]?.name.trim();
    if (!name) return;
    setLookup(index, "looking");
    try {
      const res = await fetch("/api/find-roster-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ school_name: name, gender }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        updateSchool(index, "roster_url", data.url);
        const confidence = data.confidence || "medium";
        setLookup(
          index,
          "found",
          confidence === "high"
            ? "Found. Verify it looks right."
            : "Found (low confidence). Please verify."
        );
      } else {
        // Many schools field women's soccer but not men's, so a boys lookup
        // can dead-end legitimately. Say so instead of a generic failure.
        const fail =
          gender === "boys"
            ? "Couldn't find a men's program (many schools don't field men's soccer). Paste the URL or skip this one."
            : "Couldn't find it. Paste the URL manually.";
        setLookup(index, "failed", fail);
      }
    } catch {
      setLookup(index, "failed", "Network error. Paste it manually.");
    }
  }

  function handleNameBlur(index: number) {
    const row = schools[index];
    if (!row) return;
    // Only auto-lookup if name has 3+ chars, URL is empty, and we haven't tried already
    if (
      row.name.trim().length >= 3 &&
      !row.roster_url.trim() &&
      lookupStates[index] === "idle"
    ) {
      findUrlFor(index);
    }
  }

  function addSchool() {
    setSchools((prev) => [...prev, emptyRow()]);
    setLookupStates((prev) => [...prev, "idle"]);
    setLookupNotes((prev) => [...prev, ""]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !firstName.trim() || !club.trim() || !athleteEmail.trim()) {
      setError("Please fill in email, athlete name, club, and athlete email.");
      setStatus("error");
      return;
    }

    // Accept any row with a name. URL is optional — if blank, we'll find it for them.
    const filledSchools = schools
      .filter((s) => s.name.trim())
      .map((s) => ({
        name: s.name.trim(),
        roster_url: s.roster_url.trim() || "",
      }));
    if (filledSchools.length === 0) {
      setError("Please add at least one target school.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setError("");

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          token,
          athlete: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            grad_year: gradYear,
            position,
            gender,
            current_league: currentLeague,
            division,
            club: club.trim(),
            gpa: gpa.trim() ? parseFloat(gpa) : null,
            test_score: testScore.trim() ? parseInt(testScore, 10) : null,
            reel_url: reelUrl.trim() || null,
            email: athleteEmail.trim().toLowerCase(),
            next_camp_name: campName.trim() || null,
            next_camp_date: campDate.trim() || null,
            recruit_type: recruitType,
          },
          schools: filledSchools,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Submission failed. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setError("Network error. Try again in a minute.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {isUpdate ? "Setup updated." : "You’re onboarded."}
        </h2>
        <p className="text-gray-700 leading-relaxed">
          {isUpdate
            ? "Your changes are saved. The agent will use the new list starting with this Sunday's digest. I'll reach out within 24 hours if anything needs verifying."
            : "I'll review your setup and get back to you within 24 hours with any questions. Your first weekly digest arrives this Sunday at 7 AM Eastern. Welcome to SignDay."}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-8"
    >
      {/* Your email */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Your email</h2>
        <p className="text-sm text-gray-500 mb-4">
          Where the weekly digest will land. Should be the email you used at checkout.
        </p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="parent@email.com"
          required
          className="w-full rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 placeholder-gray-400"
        />
      </section>

      {/* Athlete */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-1">About your athlete</h2>
        <p className="text-sm text-gray-500 mb-4">
          The agent uses this to personalize every coach email it drafts.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            required
            className="rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 placeholder-gray-400"
          />
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            className="rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 placeholder-gray-400"
          />
          <select
            value={gradYear}
            onChange={(e) => setGradYear(Number(e.target.value))}
            className="rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 bg-white"
          >
            <option value={2027}>Class of 2027</option>
            <option value={2028}>Class of 2028</option>
            <option value={2029}>Class of 2029</option>
            <option value={2030}>Class of 2030</option>
          </select>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 bg-white"
          >
            {POSITIONS.map((p) => (
              <option key={p.value} value={p.value}>
                Position: {p.label}
              </option>
            ))}
          </select>
          <select
            value={gender}
            onChange={(e) => {
              const g = e.target.value as "girls" | "boys";
              setGender(g);
              // Reset league to that gender's default so a girls-only league
              // (or boys-only) isn't left selected for the wrong gender.
              setCurrentLeague(g === "boys" ? "MLS_NEXT" : "ECNL");
            }}
            className="rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 bg-white"
          >
            <option value="girls">Plays: Girls / Women&apos;s soccer</option>
            <option value="boys">Plays: Boys / Men&apos;s soccer</option>
          </select>
          <select
            value={recruitType}
            onChange={(e) =>
              setRecruitType(e.target.value as "high_school" | "transfer")
            }
            className="rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 bg-white"
          >
            <option value="high_school">High school recruit</option>
            <option value="transfer">College transfer</option>
          </select>
          <select
            value={currentLeague}
            onChange={(e) => setCurrentLeague(e.target.value)}
            className="rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 bg-white"
          >
            {(gender === "boys" ? BOYS_LEAGUES : GIRLS_LEAGUES).map((l) => (
              <option key={l.value} value={l.value}>
                Current league: {l.label}
              </option>
            ))}
          </select>
          <select
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            className="rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 bg-white sm:col-span-2"
          >
            {DIVISIONS.map((d) => (
              <option key={d.value} value={d.value}>
                Target college division: {d.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={club}
            onChange={(e) => setClub(e.target.value)}
            placeholder="Club name (e.g. Connecticut FC)"
            required
            className="rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 placeholder-gray-400"
          />
          <input
            type="text"
            value={gpa}
            onChange={(e) => setGpa(e.target.value)}
            placeholder="GPA (e.g. 3.8)"
            className="rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 placeholder-gray-400"
          />
          <input
            type="text"
            value={testScore}
            onChange={(e) => setTestScore(e.target.value)}
            placeholder="ACT or SAT (optional)"
            className="rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 placeholder-gray-400"
          />
          <input
            type="url"
            value={reelUrl}
            onChange={(e) => setReelUrl(e.target.value)}
            placeholder="Hudl / video reel URL (optional)"
            className="rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 placeholder-gray-400"
          />
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Drafts tune to the division(s) you pick: academic-fit framing for D3, more athletic-profile-forward (club, league, position strengths) for D1 and D2, balanced if you&apos;re targeting a mix.
        </p>

        <input
          type="email"
          value={athleteEmail}
          onChange={(e) => setAthleteEmail(e.target.value)}
          placeholder="Athlete's Gmail (where drafts will be sent FROM)"
          required
          className="mt-4 w-full rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 placeholder-gray-400"
        />
        <p className="text-xs text-gray-500 mt-2">
          This is the email coaches see on outreach. Should be your athlete&apos;s own Gmail. Not yours.
        </p>

        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          <input
            type="text"
            value={campName}
            onChange={(e) => setCampName(e.target.value)}
            placeholder="Next ID camp / showcase (optional)"
            className="rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 placeholder-gray-400"
          />
          <input
            type="date"
            value={campDate}
            onChange={(e) => setCampDate(e.target.value)}
            className="rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900"
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Optional. Add an upcoming camp or showcase date and your weekly digest counts down to it, so outreach lands in time.
        </p>
      </section>

      {/* Schools */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Schools to track</h2>
        <p className="text-sm text-gray-500 mb-4">
          Up to 12 to start. Just type the school name and tab out. The agent finds the women&apos;s soccer roster page for you. Empty rows ignored.
        </p>

        <div className="space-y-3">
          {schools.map((s, i) => {
            const lookup = lookupStates[i] || "idle";
            const note = lookupNotes[i] || "";
            return (
              <div key={i} className="space-y-1">
                <div className="grid sm:grid-cols-[1fr_2fr_auto_auto] gap-2">
                  <input
                    type="text"
                    value={s.name}
                    onChange={(e) => updateSchool(i, "name", e.target.value)}
                    onBlur={() => handleNameBlur(i)}
                    placeholder={`School ${i + 1} (e.g. Williams College)`}
                    className="rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400"
                  />
                  <input
                    type="url"
                    value={s.roster_url}
                    onChange={(e) => updateSchool(i, "roster_url", e.target.value)}
                    placeholder={
                      lookup === "looking"
                        ? "Searching..."
                        : "Roster URL (auto-filled, or paste manually)"
                    }
                    disabled={lookup === "looking"}
                    className="rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 disabled:bg-gray-50 sm:col-span-1"
                  />
                  <button
                    type="button"
                    onClick={() => findUrlFor(i)}
                    disabled={lookup === "looking" || !s.name.trim()}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium disabled:text-gray-300 disabled:cursor-not-allowed px-2 self-center whitespace-nowrap"
                  >
                    {lookup === "looking" ? "..." : lookup === "found" ? "Refind" : "Find URL"}
                  </button>
                  <span className="hidden sm:block text-xs text-gray-400 self-center">
                    #{i + 1}
                  </span>
                </div>
                {note && (
                  <p
                    className={`text-xs ml-1 ${
                      lookup === "found"
                        ? "text-green-600"
                        : lookup === "failed"
                        ? "text-orange-600"
                        : "text-gray-500"
                    }`}
                  >
                    {note}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addSchool}
          className="mt-3 text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          + Add another school
        </button>
      </section>

      {/* Notes */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-1">
          Anything else I should know?
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Specific timing, upcoming camps, dream-school dynamics, things you&apos;ve already tried. Helpful but optional.
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional..."
          rows={4}
          className="w-full rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 placeholder-gray-400 resize-y"
        />
      </section>

      <div>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          {status === "submitting"
            ? "Saving..."
            : isUpdate
            ? "Save changes"
            : "Finish onboarding"}
        </button>
        {status === "error" && (
          <p className="text-sm text-red-600 mt-3">{error}</p>
        )}
      </div>
    </form>
  );
}
