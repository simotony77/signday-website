import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAccessToken, accessTokensEnabled } from "@/lib/accessToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/onboarding/load?email=... returns the latest onboarding submission
// for that email. Used by /onboarding to prefill the form so customers can
// update their setup (add/remove schools, change athlete info) at any time.
//
// Light privacy: we require the email belongs to an existing customer row
// (i.e. they paid). Anyone with a paying customer's email can read their
// setup, which is acceptable for MVP (5 customers, low-sensitivity data,
// Tony reviews everything anyway).
export async function GET(req: Request) {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const email = (searchParams.get("email") || "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  // This returns a minor athlete's PII, so require a valid emailed token.
  if (accessTokensEnabled()) {
    const token = searchParams.get("token") || "";
    if (!verifyAccessToken(email, token)) {
      return NextResponse.json(
        { error: "This link is invalid or expired. Request a fresh link from the account page." },
        { status: 401 }
      );
    }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Must be a paying customer
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (!customer) {
    // Not a paying customer yet. Return empty so the form behaves like first run.
    return NextResponse.json({ submission: null });
  }

  const { data: submission } = await supabase
    .from("onboarding_submissions")
    .select("athlete, schools, notes")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ submission: submission ?? null });
}
