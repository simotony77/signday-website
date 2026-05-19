"use client";

import { useState } from "react";

const POSITIONS = [
  { value: "GK", label: "Goalkeeper" },
  { value: "D", label: "Defender" },
  { value: "M", label: "Midfielder" },
  { value: "F", label: "Forward" },
];

type Status = "idle" | "submitting" | "success" | "error";

interface SchoolRow {
  name: string;
  roster_url: string;
}

function emptyRow(): SchoolRow {
  return { name: "", roster_url: "" };
}

export function OnboardingForm({ initialEmail = "" }: { initialEmail?: string }) {
  // Athlete fields
  const [email, setEmail] = useState(initialEmail);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gradYear, setGradYear] = useState(2027);
  const [position, setPosition] = useState("M");
  const [club, setClub] = useState("");
  const [gpa, setGpa] = useState("");
  const [testScore, setTestScore] = useState("");
  const [reelUrl, setReelUrl] = useState("");
  const [athleteEmail, setAthleteEmail] = useState("");
  const [notes, setNotes] = useState("");

  // Schools — start with 12 empty rows
  const [schools, setSchools] = useState<SchoolRow[]>(
    Array.from({ length: 12 }, emptyRow)
  );

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  function updateSchool(index: number, field: keyof SchoolRow, value: string) {
    setSchools((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addSchool() {
    setSchools((prev) => [...prev, emptyRow()]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !firstName.trim() || !club.trim() || !athleteEmail.trim()) {
      setError("Please fill in email, athlete name, club, and athlete email.");
      setStatus("error");
      return;
    }

    const filledSchools = schools.filter(
      (s) => s.name.trim() && s.roster_url.trim()
    );
    if (filledSchools.length === 0) {
      setError("Please add at least one target school with a roster URL.");
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
          athlete: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            grad_year: gradYear,
            position,
            club: club.trim(),
            gpa: gpa.trim() ? parseFloat(gpa) : null,
            test_score: testScore.trim() ? parseInt(testScore, 10) : null,
            reel_url: reelUrl.trim() || null,
            email: athleteEmail.trim().toLowerCase(),
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
          You&apos;re onboarded.
        </h2>
        <p className="text-gray-700 leading-relaxed">
          I&apos;ll review your setup and get back to you within 24 hours with any questions. Your first weekly digest arrives this Sunday at 7 AM Eastern. Welcome to SignDay.
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
                {p.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={club}
            onChange={(e) => setClub(e.target.value)}
            placeholder="Club (e.g. Connecticut FC ECNL)"
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
      </section>

      {/* Schools */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Schools to track</h2>
        <p className="text-sm text-gray-500 mb-4">
          Up to 12 to start. For each, give the name and the URL of their women&apos;s soccer roster page. Empty rows will be ignored.
        </p>

        <div className="space-y-3">
          {schools.map((s, i) => (
            <div key={i} className="grid sm:grid-cols-[1fr_2fr_auto] gap-2">
              <input
                type="text"
                value={s.name}
                onChange={(e) => updateSchool(i, "name", e.target.value)}
                placeholder={`School ${i + 1} (e.g. Williams College)`}
                className="rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400"
              />
              <input
                type="url"
                value={s.roster_url}
                onChange={(e) => updateSchool(i, "roster_url", e.target.value)}
                placeholder="https://athletics.example.edu/sports/womens-soccer/roster"
                className="rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 sm:col-span-1"
              />
              <span className="hidden sm:block text-xs text-gray-400 self-center">
                #{i + 1}
              </span>
            </div>
          ))}
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
          {status === "submitting" ? "Saving..." : "Finish onboarding"}
        </button>
        {status === "error" && (
          <p className="text-sm text-red-600 mt-3">{error}</p>
        )}
      </div>
    </form>
  );
}
