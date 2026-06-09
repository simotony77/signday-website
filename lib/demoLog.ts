import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

let cached: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "[demoLog] Supabase env missing: SUPABASE_URL=" +
        (!!url) +
        " SUPABASE_SERVICE_ROLE_KEY=" +
        (!!key)
    );
    return null;
  }
  cached = createClient(url, key);
  return cached;
}

// Record a demo run for admin analytics. Best-effort: never throws, never
// blocks the demo response. IP is stored only as a short one-way hash so we
// can estimate unique visitors without retaining raw IPs.
export async function logDemoRun(
  req: Request,
  kind: "cached" | "live",
  school: string,
  source?: string | null
): Promise<void> {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "";
    const ipHash = ip
      ? createHash("sha256").update(ip).digest("hex").slice(0, 16)
      : null;
    const cleanSource =
      typeof source === "string" && source.trim()
        ? source.trim().slice(0, 40)
        : "direct";
    const { error } = await supabase
      .from("demo_runs")
      .insert({ kind, school: school || null, ip_hash: ipHash, source: cleanSource });
    if (error) {
      console.error("[demoLog] demo_runs insert failed:", error.message, error.details, error.hint);
    }
  } catch (e) {
    console.error("[demoLog] demo_runs threw:", e instanceof Error ? e.message : e);
    /* analytics must never break the demo */
  }
}

// Persist an anonymous "what would make this a yes?" answer from a prospect
// who saw the demo result but isn't ready to leave an email. Best-effort.
export async function saveDemoFeedback(
  req: Request,
  fields: {
    feedback: string;
    school_name?: string | null;
    source?: string | null;
  }
): Promise<void> {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "";
    const ipHash = ip
      ? createHash("sha256").update(ip).digest("hex").slice(0, 16)
      : null;
    const cleanSource =
      typeof fields.source === "string" && fields.source.trim()
        ? fields.source.trim().slice(0, 40)
        : "direct";
    const { error } = await supabase.from("demo_feedback").insert({
      feedback: fields.feedback.trim().slice(0, 1000),
      school_name: fields.school_name?.trim().slice(0, 120) || null,
      source: cleanSource,
      ip_hash: ipHash,
    });
    if (error) {
      console.error("[demoLog] demo_feedback insert failed:", error.message, error.details, error.hint);
    }
  } catch (e) {
    console.error("[demoLog] demo_feedback threw:", e instanceof Error ? e.message : e);
    /* feedback capture is opt-in best-effort; never blocks anything */
  }
}

// Persist a warm demo lead (prospect opted in to be emailed their draft).
// Best-effort: never throws so a storage hiccup can't block the email send.
export async function saveDemoLead(fields: {
  email: string;
  first_name?: string | null;
  school_name?: string | null;
  source?: string | null;
}): Promise<void> {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    const cleanSource =
      typeof fields.source === "string" && fields.source.trim()
        ? fields.source.trim().slice(0, 40)
        : "direct";
    const { error } = await supabase.from("demo_leads").insert({
      email: fields.email.trim().toLowerCase().slice(0, 200),
      first_name: fields.first_name?.trim().slice(0, 50) || null,
      school_name: fields.school_name?.trim().slice(0, 120) || null,
      source: cleanSource,
    });
    if (error) {
      console.error("[demoLog] demo_leads insert failed:", error.message, error.details, error.hint);
    }
  } catch (e) {
    console.error("[demoLog] demo_leads threw:", e instanceof Error ? e.message : e);
    /* lead capture must never break the email send */
  }
}
