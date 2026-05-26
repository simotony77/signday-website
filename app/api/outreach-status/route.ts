import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAccessToken, accessTokensEnabled } from "@/lib/accessToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_STATUS = new Set([
  "not_contacted",
  "sent",
  "replied",
  "visit",
  "not_pursuing",
]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Returns the customer's tracked schools (from their latest onboarding
// submission) plus any saved outreach statuses, so the tracker page can render
// every school with its current status. Token-gated (athlete PII).
export async function GET(req: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const email = (searchParams.get("email") || "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }
  if (accessTokensEnabled()) {
    const token = searchParams.get("token") || "";
    if (!verifyAccessToken(email, token)) {
      return NextResponse.json(
        { error: "This link is invalid or expired. Request a fresh one from the account page." },
        { status: 401 }
      );
    }
  }

  // Tracked schools from the latest onboarding submission.
  const { data: submission } = await supabase
    .from("onboarding_submissions")
    .select("schools")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const schools = Array.isArray(submission?.schools)
    ? (submission!.schools as { name?: string; roster_url?: string }[])
    : [];

  const { data: statuses } = await supabase
    .from("outreach_status")
    .select("school_name, roster_url, status, last_contacted_at, last_reply_at, notes")
    .eq("email", email);

  return NextResponse.json({
    schools: schools
      .filter((s) => s?.name)
      .map((s) => ({ name: s.name as string, roster_url: s.roster_url || "" })),
    statuses: statuses ?? [],
  });
}

interface StatusUpdate {
  school_name?: string;
  roster_url?: string | null;
  status?: string;
  last_contacted_at?: string | null;
  last_reply_at?: string | null;
  notes?: string | null;
}

// Upserts the parent's per-school status. Token-gated.
export async function POST(req: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }

  let body: { email?: string; token?: string; statuses?: StatusUpdate[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }
  if (accessTokensEnabled()) {
    if (!verifyAccessToken(email, body.token || "")) {
      return NextResponse.json(
        { error: "This link is invalid or expired. Request a fresh one from the account page." },
        { status: 401 }
      );
    }
  }
  if (!Array.isArray(body.statuses)) {
    return NextResponse.json({ error: "Missing statuses." }, { status: 400 });
  }

  // Resolve the customer id (best-effort) so rows tie back to the customer.
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const customerId = customer?.id ?? null;

  const cleanDate = (v: string | null | undefined): string | null =>
    typeof v === "string" && DATE_RE.test(v) ? v : null;

  const rows = body.statuses
    .filter((s) => s.school_name && s.school_name.trim())
    .slice(0, 100) // sanity cap
    .map((s) => ({
      customer_id: customerId,
      email,
      school_name: s.school_name!.trim().slice(0, 120),
      roster_url: s.roster_url ? String(s.roster_url).slice(0, 500) : null,
      status: VALID_STATUS.has(s.status || "") ? s.status : "not_contacted",
      last_contacted_at: cleanDate(s.last_contacted_at),
      last_reply_at: cleanDate(s.last_reply_at),
      notes: s.notes ? String(s.notes).slice(0, 500) : null,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, saved: 0 });
  }

  const { error } = await supabase
    .from("outreach_status")
    .upsert(rows, { onConflict: "email,school_name" });

  if (error) {
    console.error("outreach-status upsert error:", error);
    return NextResponse.json(
      { error: "Could not save. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, saved: rows.length });
}
