"use client";

import { useEffect, useState } from "react";

interface Stats {
  generated_at: string;
  revenue: {
    active_subscribers: number;
    est_mrr: number;
    cancelled: number;
    total_customers: number;
  };
  funnel: {
    signups_total: number;
    signups_7d: number;
    onboarded: number;
    not_onboarded: number;
    onboarding_rate: number;
    not_onboarded_emails: string[];
    referred_signups: number;
  };
  agent: {
    digests_sent: number;
    drafts_generated: number;
    triggers_detected: number;
    last_digest_at: string | null;
  };
  scrape_health: {
    skips_7d: number;
    held_7d: number;
    flaky_schools: { name: string; count: number }[];
  };
  athletes: {
    total: number;
    by_grad_year: Record<string, number>;
    by_position: Record<string, number>;
    by_division: Record<string, number>;
    by_league: Record<string, number>;
  };
  schools: {
    distinct_tracked: number;
    avg_per_athlete: number;
    top_schools: { name: string; count: number }[];
  };
  demo: {
    total_runs: number;
    runs_24h: number;
    runs_7d: number;
    live_runs: number;
    cached_runs: number;
    unique_visitors_7d: number;
    last_run_at: string | null;
    top_demoed_schools: { name: string; count: number }[];
    by_source: Record<string, number>;
  };
  leads: {
    total: number;
    last_7d: number;
    recent: {
      email: string;
      first_name: string | null;
      school: string | null;
      source: string;
      created_at: string;
    }[];
  };
  feedback: {
    total: number;
    last_7d: number;
    recent: {
      feedback: string;
      school_name: string | null;
      source: string | null;
      created_at: string;
    }[];
  };
  recent_customers: {
    email: string;
    status: string | null;
    onboarded: boolean;
    created_at: string;
  }[];
}

const KEY_STORAGE = "signday_admin_key";

function fmtDate(iso: string | null): string {
  if (!iso) return "never";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
      <div className="text-3xl font-extrabold text-gray-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function Breakdown({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="text-sm font-bold text-gray-900 mb-3">{title}</div>
      {entries.length === 0 ? (
        <div className="text-xs text-gray-400">No data yet.</div>
      ) : (
        <div className="space-y-2">
          {entries.map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 text-sm">
              <div className="w-24 truncate text-gray-700">{k}</div>
              <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-brand-600 h-4 rounded-full"
                  style={{ width: `${(v / max) * 100}%` }}
                />
              </div>
              <div className="w-8 text-right text-gray-900 font-medium">{v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminDashboard() {
  const [key, setKey] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ok">("idle");
  const [error, setError] = useState("");

  async function load(k: string) {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { "x-admin-key": k },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || `Failed (HTTP ${res.status}).`);
        setStatus("error");
        return;
      }
      const data = (await res.json()) as Stats;
      setStats(data);
      setStatus("ok");
      localStorage.setItem(KEY_STORAGE, k);
    } catch {
      setError("Network error.");
      setStatus("error");
    }
  }

  // Auto-load if a key is already stored.
  useEffect(() => {
    const saved = localStorage.getItem(KEY_STORAGE);
    if (saved) {
      setKey(saved);
      load(saved);
    }
  }, []);

  if (status !== "ok" || !stats) {
    return (
      <div className="max-w-sm mx-auto px-6 py-24">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-1">SignDay Admin</h1>
        <p className="text-sm text-gray-500 mb-6">Enter the admin key to view stats.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(key);
          }}
          className="space-y-3"
        >
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Admin key"
            className="w-full rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none px-4 py-3 text-base"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl"
          >
            {status === "loading" ? "Loading..." : "View dashboard"}
          </button>
          {status === "error" && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </div>
    );
  }

  const {
    revenue,
    funnel,
    agent,
    scrape_health,
    athletes,
    schools,
    demo,
    leads,
    feedback,
    recent_customers,
  } = stats;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">SignDay Admin</h1>
          <p className="text-xs text-gray-500">Updated {fmtDate(stats.generated_at)}</p>
        </div>
        <button
          onClick={() => load(key)}
          className="text-sm bg-white border border-gray-200 rounded-xl px-4 py-2 hover:border-gray-300"
        >
          Refresh
        </button>
      </div>

      {/* Money */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Revenue</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Active subs" value={revenue.active_subscribers} />
        <Stat label="Est. MRR" value={`$${revenue.est_mrr.toLocaleString()}`} sub="active × $99/mo" />
        <Stat label="Cancelled" value={revenue.cancelled} />
        <Stat
          label="Onboarded"
          value={`${funnel.onboarding_rate}%`}
          sub={`${funnel.onboarded} of ${revenue.active_subscribers} active`}
        />
      </div>

      {/* Funnel */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Funnel</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
        <Stat label="Total signups" value={funnel.signups_total} />
        <Stat label="New (7 days)" value={funnel.signups_7d} />
        <Stat label="Paid, not onboarded" value={funnel.not_onboarded} sub="chase these" />
        <Stat label="Referred signups" value={funnel.referred_signups} sub="from referral links" />
      </div>
      {funnel.not_onboarded_emails.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8 text-sm">
          <div className="font-semibold text-amber-900 mb-1">Paid but haven&apos;t onboarded:</div>
          <div className="text-amber-800">{funnel.not_onboarded_emails.join(", ")}</div>
        </div>
      )}
      {funnel.not_onboarded_emails.length === 0 && <div className="mb-8" />}

      {/* Agent */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Agent output</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Digests sent" value={agent.digests_sent} />
        <Stat label="Drafts generated" value={agent.drafts_generated} />
        <Stat label="Triggers detected" value={agent.triggers_detected} />
        <Stat label="Last digest" value={fmtDate(agent.last_digest_at)} />
      </div>

      {/* Scrape health */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Scrape health (last 7 days)</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Stat label="Schools skipped" value={scrape_health.skips_7d} sub="bad/partial read, auto-retried" />
        <Stat label="Digests held" value={scrape_health.held_7d} sub="abnormal volume, not sent" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-8">
        <div className="text-sm font-bold text-gray-900 mb-1">Flaky schools</div>
        <div className="text-xs text-gray-400 mb-3">
          Pages the scraper couldn&apos;t read cleanly. Repeat offenders may need a different roster URL.
        </div>
        {scrape_health.flaky_schools.length === 0 ? (
          <div className="text-xs text-gray-400">No skips in the last 7 days. All schools read cleanly.</div>
        ) : (
          <ol className="space-y-1.5 text-sm">
            {scrape_health.flaky_schools.map((s, i) => (
              <li key={s.name} className="flex justify-between">
                <span className="text-gray-700">{i + 1}. {s.name}</span>
                <span className="text-amber-700 font-medium">{s.count}×</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Demo usage */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Demo usage</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Stat label="Demo runs (total)" value={demo.total_runs} />
        <Stat label="Last 7 days" value={demo.runs_7d} sub={`${demo.runs_24h} in last 24h`} />
        <Stat label="Unique visitors (7d)" value={demo.unique_visitors_7d} />
        <Stat
          label="Live vs cached"
          value={`${demo.live_runs} / ${demo.cached_runs}`}
          sub="typed-any-school / preset"
        />
      </div>
      <div className="mb-4">
        <Breakdown title="Demo runs by source (google = ad, direct = organic)" data={demo.by_source} />
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-8">
        <div className="text-sm font-bold text-gray-900 mb-1">Most-demoed schools</div>
        <div className="text-xs text-gray-400 mb-3">
          What prospects actually try. Live entries are schools they typed themselves.
        </div>
        {demo.top_demoed_schools.length === 0 ? (
          <div className="text-xs text-gray-400">No demo runs yet.</div>
        ) : (
          <ol className="space-y-1.5 text-sm">
            {demo.top_demoed_schools.map((s, i) => (
              <li key={s.name} className="flex justify-between">
                <span className="text-gray-700">{i + 1}. {s.name}</span>
                <span className="text-gray-900 font-medium">{s.count}</span>
              </li>
            ))}
          </ol>
        )}
        <div className="text-xs text-gray-400 mt-3">Last demo run: {fmtDate(demo.last_run_at)}</div>
      </div>

      {/* Demo leads */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Demo leads (asked to be emailed their draft)</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Stat label="Leads (total)" value={leads.total} />
        <Stat label="New (7 days)" value={leads.last_7d} sub="warm — follow up" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-8">
        {leads.recent.length === 0 ? (
          <div className="p-5 text-xs text-gray-400">No demo leads yet. They appear when a prospect asks the demo to email them their draft.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Email</th>
                <th className="text-left px-4 py-2 font-semibold">Athlete</th>
                <th className="text-left px-4 py-2 font-semibold">School</th>
                <th className="text-left px-4 py-2 font-semibold">Source</th>
                <th className="text-left px-4 py-2 font-semibold">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.recent.map((l, i) => (
                <tr key={`${l.email}-${i}`}>
                  <td className="px-4 py-2 text-gray-900">{l.email}</td>
                  <td className="px-4 py-2 text-gray-700">{l.first_name || "—"}</td>
                  <td className="px-4 py-2 text-gray-700">{l.school || "—"}</td>
                  <td className="px-4 py-2 text-gray-500">{l.source}</td>
                  <td className="px-4 py-2 text-gray-500">{fmtDate(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Anonymous demo feedback ("what would make this a yes?") */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
        Demo feedback (anonymous &mdash; what prospects say)
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Stat label="Feedback (total)" value={feedback.total} />
        <Stat label="New (7 days)" value={feedback.last_7d} sub="read every one" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-8">
        {feedback.recent.length === 0 ? (
          <div className="text-xs text-gray-400">
            No feedback yet. They appear when a prospect drops a one-line answer to &ldquo;what would make this a yes?&rdquo; on the demo page.
          </div>
        ) : (
          <ul className="space-y-3">
            {feedback.recent.map((f, i) => (
              <li key={i} className="border-l-2 border-gray-300 pl-3">
                <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">{f.feedback}</p>
                <div className="text-xs text-gray-500 mt-1">
                  {f.school_name || "—"} &middot; {f.source || "direct"} &middot; {fmtDate(f.created_at)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Who's signing up */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Who&apos;s signing up</h2>
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <Breakdown title="By grad year" data={athletes.by_grad_year} />
        <Breakdown title="By position" data={athletes.by_position} />
        <Breakdown title="By target division" data={athletes.by_division} />
        <Breakdown title="By current league" data={athletes.by_league} />
      </div>

      {/* Schools */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Schools tracked</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Stat label="Distinct schools" value={schools.distinct_tracked} />
        <Stat label="Avg per athlete" value={schools.avg_per_athlete} />
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-8">
        <div className="text-sm font-bold text-gray-900 mb-3">Most-tracked schools</div>
        {schools.top_schools.length === 0 ? (
          <div className="text-xs text-gray-400">No schools tracked yet.</div>
        ) : (
          <ol className="space-y-1.5 text-sm">
            {schools.top_schools.map((s, i) => (
              <li key={s.name} className="flex justify-between">
                <span className="text-gray-700">{i + 1}. {s.name}</span>
                <span className="text-gray-900 font-medium">{s.count}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Recent signups */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recent signups</h2>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {recent_customers.length === 0 ? (
          <div className="p-5 text-xs text-gray-400">No customers yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Email</th>
                <th className="text-left px-4 py-2 font-semibold">Status</th>
                <th className="text-left px-4 py-2 font-semibold">Onboarded</th>
                <th className="text-left px-4 py-2 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recent_customers.map((c) => (
                <tr key={c.email}>
                  <td className="px-4 py-2 text-gray-900">{c.email}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        c.status === "active"
                          ? "bg-green-100 text-green-700"
                          : c.status === "cancelled"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {c.status || "unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-2">{c.onboarded ? "yes" : "no"}</td>
                  <td className="px-4 py-2 text-gray-500">{fmtDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
