"use client";

import { useState } from "react";

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

export function DemoForm() {
  const [firstName, setFirstName] = useState("");
  const [gradYear, setGradYear] = useState(2027);
  const [position, setPosition] = useState("M");
  const [club, setClub] = useState("");
  const [school, setSchool] = useState("williams");

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<{ subject: string; body: string; trigger: string; coach: string; school_name: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !club.trim()) {
      setError("Please fill in first name and club.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError("");
    setDraft(null);

    try {
      const res = await fetch("/api/demo-draft", {
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

      setDraft(data.draft);
      setStatus("success");
    } catch {
      setError("Network error. Try again in a minute.");
      setStatus("error");
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
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
            className="w-full rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base text-gray-900 bg-white"
          >
            {SCHOOLS.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-2">
            We&apos;ve already snapshot-scraped these 12 D3 academic programs. Click Generate and the agent uses that real roster + coach data to write a personalized outreach email.
          </p>
        </div>

        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          {status === "loading" ? "Generating draft (10-15 sec)..." : "Generate coach email"}
        </button>

        {status === "error" && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </form>

      {draft && status === "success" && (
        <div className="mt-8">
          <h2 className="text-base font-semibold text-gray-900 mb-2">
            Here&apos;s what your athlete would send to {draft.school_name}:
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Trigger: {draft.trigger}
          </p>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-gray-50 border-b border-gray-100 px-6 py-3 text-sm space-y-1">
              <div>
                <span className="text-gray-500 inline-block w-16">To:</span>
                <span className="text-gray-900">{draft.coach}</span>
              </div>
              <div>
                <span className="text-gray-500 inline-block w-16">Subject:</span>
                <span className="text-gray-900 font-semibold">{draft.subject}</span>
              </div>
            </div>
            <div className="p-6 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {draft.body}
            </div>
          </div>

          <div className="mt-8 bg-brand-50 border border-brand-100 rounded-2xl p-6 text-center">
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              Want this every Sunday, for your real list of 12 schools?
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              SignDay watches all of your target schools weekly. When a senior graduates at your position, a coach leaves, or a new commit announces, the agent drafts the outreach. You approve and send via Gmail.
            </p>
            <a
              href="/"
              className="inline-block bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl"
            >
              Join the waitlist
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
