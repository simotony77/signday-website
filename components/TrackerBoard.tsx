"use client";

import { useEffect, useState } from "react";

interface Row {
  school_name: string;
  roster_url: string;
  status: string;
  last_contacted_at: string; // yyyy-mm-dd or ""
  last_reply_at: string;
  notes: string;
}

const STATUS_OPTIONS = [
  { value: "not_contacted", label: "Not contacted" },
  { value: "sent", label: "Sent (awaiting reply)" },
  { value: "replied", label: "Replied" },
  { value: "visit", label: "Visit / camp invite" },
  { value: "not_pursuing", label: "Not pursuing" },
];

function daysSince(dateStr: string): number | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

// Derived badge from status + last-contacted date. Silence only matters while
// we're awaiting a reply on a sent email.
function badge(row: Row): { text: string; cls: string } {
  if (row.status === "replied")
    return { text: "Replied", cls: "bg-green-100 text-green-700" };
  if (row.status === "visit")
    return { text: "Visit invite", cls: "bg-green-100 text-green-700" };
  if (row.status === "not_pursuing")
    return { text: "Not pursuing", cls: "bg-gray-100 text-gray-600" };
  if (row.status === "sent") {
    const d = daysSince(row.last_contacted_at);
    if (d === null) return { text: "Sent", cls: "bg-blue-100 text-blue-700" };
    if (d >= 21) return { text: `Silent ${d}d`, cls: "bg-red-100 text-red-700" };
    if (d >= 14) return { text: `Quiet ${d}d`, cls: "bg-orange-100 text-orange-700" };
    return { text: `Awaiting ${d}d`, cls: "bg-blue-100 text-blue-700" };
  }
  return { text: "Not contacted", cls: "bg-gray-100 text-gray-600" };
}

export function TrackerBoard({
  initialEmail = "",
  token = "",
}: {
  initialEmail?: string;
  token?: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<
    "idle" | "loading" | "ready" | "saving" | "saved" | "error"
  >("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const email = initialEmail.trim().toLowerCase();
    if (!email) {
      setStatus("error");
      setError("Open this page from your welcome email or the account link.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/outreach-status?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Could not load your schools.");
          setStatus("error");
          return;
        }
        const schools: { name: string; roster_url: string }[] = data.schools || [];
        const statuses: Record<string, Partial<Row>> = {};
        for (const s of data.statuses || []) statuses[s.school_name] = s;
        const merged: Row[] = schools.map((s) => {
          const st = statuses[s.name] || {};
          return {
            school_name: s.name,
            roster_url: s.roster_url || "",
            status: (st.status as string) || "not_contacted",
            last_contacted_at: (st.last_contacted_at as string) || "",
            last_reply_at: (st.last_reply_at as string) || "",
            notes: (st.notes as string) || "",
          };
        });
        setRows(merged);
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setError("Network error. Try again in a minute.");
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialEmail, token]);

  function update(i: number, field: keyof Row, value: string) {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
    if (status === "saved") setStatus("ready");
  }

  async function save() {
    setStatus("saving");
    setError("");
    try {
      const res = await fetch("/api/outreach-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: initialEmail.trim().toLowerCase(),
          token,
          statuses: rows.map((r) => ({
            school_name: r.school_name,
            roster_url: r.roster_url || null,
            status: r.status,
            last_contacted_at: r.last_contacted_at || null,
            last_reply_at: r.last_reply_at || null,
            notes: r.notes || null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save. Try again.");
        setStatus("error");
        return;
      }
      setStatus("saved");
    } catch {
      setError("Network error. Try again in a minute.");
      setStatus("error");
    }
  }

  if (status === "loading") {
    return <div className="text-center text-gray-500 py-12">Loading your schools...</div>;
  }

  if (status === "error" && rows.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center text-sm text-gray-600">
        No schools yet. Finish onboarding first and your tracked schools will
        show up here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
        {rows.map((r, i) => {
          const b = badge(r);
          return (
            <div key={r.school_name} className="p-4 md:p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="font-semibold text-gray-900 truncate">{r.school_name}</div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${b.cls}`}>
                  {b.text}
                </span>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Status</label>
                  <select
                    value={r.status}
                    onChange={(e) => update(i, "status", e.target.value)}
                    className="w-full rounded-lg border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-3 py-2 text-sm bg-white text-gray-900"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Last emailed coach</label>
                  <input
                    type="date"
                    value={r.last_contacted_at}
                    onChange={(e) => update(i, "last_contacted_at", e.target.value)}
                    className="w-full rounded-lg border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-3 py-2 text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Note (optional)</label>
                  <input
                    type="text"
                    value={r.notes}
                    onChange={(e) => update(i, "notes", e.target.value)}
                    placeholder="e.g. likes my reel"
                    className="w-full rounded-lg border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-3 py-2 text-sm text-gray-900 placeholder-gray-400"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={save}
          disabled={status === "saving"}
          className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          {status === "saving" ? "Saving..." : "Save tracker"}
        </button>
        {status === "saved" && <span className="text-sm text-green-600">Saved.</span>}
        {status === "error" && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
