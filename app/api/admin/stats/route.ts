import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRICE_MONTHLY = 99;

function checkKey(provided: string): boolean {
  const secret = process.env.ADMIN_SECRET || "";
  if (!secret || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

function tally(items: (string | number | null | undefined)[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const raw of items) {
    if (raw === null || raw === undefined || raw === "") continue;
    const k = String(raw);
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

interface CustomerRow {
  email: string;
  subscription_status: string | null;
  onboarded_at: string | null;
  created_at: string;
  referred_by: string | null;
}
interface SubmissionRow {
  email: string;
  athlete: Record<string, unknown> | null;
  schools: { name?: string; roster_url?: string }[] | null;
  created_at: string;
}
interface DigestRow {
  drafts_count: number | null;
  triggers_count: number | null;
  schools_tracked: number | null;
  is_baseline: boolean | null;
  sent_at: string;
}

export async function GET(req: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Admin not configured. Set ADMIN_SECRET in the environment." },
      { status: 503 }
    );
  }
  const key =
    req.headers.get("x-admin-key") ||
    new URL(req.url).searchParams.get("key") ||
    "";
  if (!checkKey(key)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const [customersRes, subsRes, digestsRes, demoRes] = await Promise.all([
    supabase
      .from("customers")
      .select("email, subscription_status, onboarded_at, created_at, referred_by")
      .order("created_at", { ascending: false }),
    supabase
      .from("onboarding_submissions")
      .select("email, athlete, schools, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("digests")
      .select("drafts_count, triggers_count, schools_tracked, is_baseline, sent_at")
      .order("sent_at", { ascending: false }),
    supabase
      .from("demo_runs")
      .select("kind, school, ip_hash, created_at")
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);

  const customers = (customersRes.data || []) as CustomerRow[];
  const subs = (subsRes.data || []) as SubmissionRow[];
  const digests = (digestsRes.data || []) as DigestRow[];
  const demoRuns = (demoRes.data || []) as {
    kind: string;
    school: string | null;
    ip_hash: string | null;
    created_at: string;
  }[];

  const now = Date.now();
  const dayAgo = now - 24 * 3600 * 1000;
  const weekAgo = now - 7 * 24 * 3600 * 1000;

  // ---- Revenue / customers ----
  const active = customers.filter((c) => c.subscription_status === "active");
  const cancelled = customers.filter(
    (c) => c.subscription_status === "cancelled"
  );
  const onboardedActive = active.filter((c) => c.onboarded_at);
  const notOnboarded = active.filter((c) => !c.onboarded_at);

  // ---- Funnel ----
  const signups7d = customers.filter(
    (c) => new Date(c.created_at).getTime() >= weekAgo
  ).length;

  // ---- Agent output ----
  const digestsSent = digests.length;
  const draftsGenerated = digests.reduce((n, d) => n + (d.drafts_count || 0), 0);
  const triggersDetected = digests.reduce(
    (n, d) => n + (d.triggers_count || 0),
    0
  );
  const lastDigestAt = digests[0]?.sent_at || null;

  // ---- Athlete + school breakdowns (latest submission per email) ----
  const latestByEmail = new Map<string, SubmissionRow>();
  for (const s of subs) {
    if (!latestByEmail.has(s.email)) latestByEmail.set(s.email, s); // subs are desc by created_at
  }
  const latestSubs = [...latestByEmail.values()];

  const gradYears: (string | number)[] = [];
  const positions: string[] = [];
  const divisions: string[] = [];
  const leagues: string[] = [];
  const schoolNames: string[] = [];
  let totalSchoolEntries = 0;

  for (const s of latestSubs) {
    const a = s.athlete || {};
    if (a.grad_year != null) gradYears.push(a.grad_year as number);
    if (a.position) positions.push(String(a.position));
    if (a.division) divisions.push(String(a.division));
    if (a.current_league) leagues.push(String(a.current_league));
    const schools = Array.isArray(s.schools) ? s.schools : [];
    for (const sch of schools) {
      if (sch?.name) {
        schoolNames.push(sch.name.trim());
        totalSchoolEntries++;
      }
    }
  }

  const schoolTally = tally(schoolNames);
  const topSchools = Object.entries(schoolTally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // ---- Demo usage ----
  const demoRuns24h = demoRuns.filter(
    (r) => new Date(r.created_at).getTime() >= dayAgo
  );
  const demoRuns7d = demoRuns.filter(
    (r) => new Date(r.created_at).getTime() >= weekAgo
  );
  const uniqueVisitors7d = new Set(
    demoRuns7d.map((r) => r.ip_hash).filter(Boolean)
  ).size;
  const demoTopSchools = Object.entries(
    tally(demoRuns.map((r) => r.school))
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    revenue: {
      active_subscribers: active.length,
      est_mrr: active.length * PRICE_MONTHLY,
      cancelled: cancelled.length,
      total_customers: customers.length,
    },
    funnel: {
      signups_total: customers.length,
      signups_7d: signups7d,
      onboarded: onboardedActive.length,
      not_onboarded: notOnboarded.length,
      onboarding_rate:
        active.length > 0
          ? Math.round((onboardedActive.length / active.length) * 100)
          : 0,
      not_onboarded_emails: notOnboarded.map((c) => c.email),
      referred_signups: customers.filter((c) => c.referred_by).length,
    },
    agent: {
      digests_sent: digestsSent,
      drafts_generated: draftsGenerated,
      triggers_detected: triggersDetected,
      last_digest_at: lastDigestAt,
    },
    athletes: {
      total: latestSubs.length,
      by_grad_year: tally(gradYears),
      by_position: tally(positions),
      by_division: tally(divisions),
      by_league: tally(leagues),
    },
    schools: {
      distinct_tracked: Object.keys(schoolTally).length,
      avg_per_athlete:
        latestSubs.length > 0
          ? Math.round((totalSchoolEntries / latestSubs.length) * 10) / 10
          : 0,
      top_schools: topSchools,
    },
    demo: {
      total_runs: demoRuns.length,
      runs_24h: demoRuns24h.length,
      runs_7d: demoRuns7d.length,
      live_runs: demoRuns.filter((r) => r.kind === "live").length,
      cached_runs: demoRuns.filter((r) => r.kind === "cached").length,
      unique_visitors_7d: uniqueVisitors7d,
      last_run_at: demoRuns[0]?.created_at || null,
      top_demoed_schools: demoTopSchools,
    },
    recent_customers: customers.slice(0, 15).map((c) => ({
      email: c.email,
      status: c.subscription_status,
      onboarded: !!c.onboarded_at,
      created_at: c.created_at,
    })),
  });
}
