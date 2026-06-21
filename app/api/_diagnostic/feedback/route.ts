import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-gated diagnostic for the demo_feedback pipeline. Reads, inserts a
// labelled test row, reads again, and returns each step's result so Tony can
// see immediately whether: the env is wired up, the table exists, RLS is
// passing, and inserts are landing. Saves greping Vercel logs.
//
// Usage:
//   curl "https://www.signdayapp.com/api/_diagnostic/feedback?key=<ADMIN_SECRET>"
// or paste that URL in a browser. Same admin key as /admin.

function checkKey(provided: string): boolean {
  const secret = process.env.ADMIN_SECRET || "";
  if (!secret || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key") || "";
  if (!checkKey(key)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const out: Record<string, unknown> = {
    env: {
      has_supabase_url: !!supabaseUrl,
      has_service_role_key: !!supabaseServiceKey,
      has_admin_secret: !!process.env.ADMIN_SECRET,
    },
  };

  if (!supabaseUrl || !supabaseServiceKey) {
    out.error = "Supabase env vars missing on Vercel.";
    return NextResponse.json(out, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Step 1: read existing rows
  const before = await supabase
    .from("demo_feedback")
    .select("id, feedback, created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  out.read_before = {
    error: before.error
      ? {
          message: before.error.message,
          details: before.error.details,
          hint: before.error.hint,
          code: before.error.code,
        }
      : null,
    row_count: (before.data || []).length,
    recent_rows: before.data || [],
  };

  // Step 2: try to insert a labelled test row
  const label = `__diagnostic_test_${new Date().toISOString()}`;
  const insert = await supabase.from("demo_feedback").insert({
    feedback: label,
    school_name: "DIAGNOSTIC",
    source: "diagnostic",
    ip_hash: null,
  });
  out.insert_attempt = {
    label,
    error: insert.error
      ? {
          message: insert.error.message,
          details: insert.error.details,
          hint: insert.error.hint,
          code: insert.error.code,
        }
      : null,
    succeeded: !insert.error,
  };

  // Step 3: read again to confirm the row actually landed
  const after = await supabase
    .from("demo_feedback")
    .select("id, feedback, created_at")
    .eq("feedback", label)
    .limit(1);
  out.read_after = {
    error: after.error
      ? {
          message: after.error.message,
          details: after.error.details,
          hint: after.error.hint,
        }
      : null,
    found_test_row: (after.data || []).length > 0,
  };

  // Step 4: clean up the test row so /admin isn't cluttered
  if ((after.data || []).length > 0) {
    await supabase.from("demo_feedback").delete().eq("feedback", label);
    out.cleanup = "removed diagnostic row";
  } else {
    out.cleanup = "no row to remove";
  }

  return NextResponse.json(out, { status: 200 });
}
