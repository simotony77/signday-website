import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { verifyAccessToken, accessTokensEnabled } from "@/lib/accessToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SchoolEntry {
  name: string;
  roster_url: string;
}

export async function POST(req: Request) {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromAddress =
    process.env.WAITLIST_FROM_EMAIL || "Tony <tony@signdayapp.com>";
  const notifyAddress =
    process.env.WAITLIST_NOTIFY_EMAIL || "tony@signdayapp.com";

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }

  let body: {
    email?: string;
    token?: string;
    athlete?: Record<string, unknown>;
    schools?: SchoolEntry[];
    notes?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  // Saving onboarding writes a customer's athlete/school data, so require a
  // valid emailed token (from the welcome email or the account link).
  if (accessTokensEnabled()) {
    const token = typeof body.token === "string" ? body.token : "";
    if (!verifyAccessToken(email, token)) {
      return NextResponse.json(
        { error: "This onboarding link is invalid or expired. Open the link from your welcome email, or request a fresh one at /account." },
        { status: 401 }
      );
    }
  }

  if (!body.athlete || typeof body.athlete !== "object") {
    return NextResponse.json({ error: "Athlete is required." }, { status: 400 });
  }

  if (!Array.isArray(body.schools) || body.schools.length === 0) {
    return NextResponse.json(
      { error: "At least one school required." },
      { status: 400 }
    );
  }

  // Light validation of each school. URL is optional — Tony resolves blank URLs
  // manually (or via the find-roster-url agent during onboarding form fill).
  for (const s of body.schools) {
    if (!s.name) {
      return NextResponse.json(
        { error: "Each school must have a name." },
        { status: 400 }
      );
    }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Try to find an existing customer row for this email (created by stripe webhook)
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const customerId = customer?.id ?? null;

  const { error: insertError } = await supabase
    .from("onboarding_submissions")
    .insert({
      customer_id: customerId,
      email,
      athlete: body.athlete,
      schools: body.schools,
      notes: body.notes ?? null,
    });

  if (insertError) {
    console.error("onboarding insert error:", insertError);
    return NextResponse.json(
      { error: "Could not save onboarding. Please try again." },
      { status: 500 }
    );
  }

  // Mark customer as onboarded if we found one
  if (customerId) {
    await supabase
      .from("customers")
      .update({ onboarded_at: new Date().toISOString() })
      .eq("id", customerId);
  }

  // Notify Tony
  if (resendApiKey) {
    const resend = new Resend(resendApiKey);
    try {
      const athlete = body.athlete as Record<string, unknown>;
      const athleteSummary = `${athlete.first_name ?? "?"} ${athlete.last_name ?? ""} (Class of ${athlete.grad_year ?? "?"}, ${athlete.position ?? "?"}, ${athlete.club ?? "?"} ${athlete.current_league ?? ""}, target: ${athlete.division ?? "D3"})`;
      const schoolList = body.schools
        .map(
          (s, i) =>
            `  ${i + 1}. ${s.name}${s.roster_url ? ` - ${s.roster_url}` : " - (URL NOT PROVIDED — needs lookup)"}`
        )
        .join("\n");
      const needsUrlCount = body.schools.filter((s) => !s.roster_url).length;

      await resend.emails.send({
        from: fromAddress,
        to: notifyAddress,
        subject: `New SignDay onboarding: ${email}`,
        text: `New onboarding submission.

Email:    ${email}
Customer: ${customerId || "(no customer record found yet)"}
Athlete:  ${athleteSummary}

Schools (${body.schools.length}, ${needsUrlCount} missing URL):
${schoolList}

Notes:
${body.notes || "(none)"}

Next: ${needsUrlCount > 0 ? `resolve ${needsUrlCount} missing URLs, then ` : ""}scrape these schools as baseline, then run agent each Sunday.
View raw row: https://supabase.com/dashboard/project/teamquykkznndcmknvpy/editor
`,
      });
    } catch (e) {
      console.error("onboarding notify send error:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
