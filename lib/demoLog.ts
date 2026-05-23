import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

let cached: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cached = createClient(url, key);
  return cached;
}

// Record a demo run for admin analytics. Best-effort: never throws, never
// blocks the demo response. IP is stored only as a short one-way hash so we
// can estimate unique visitors without retaining raw IPs.
export async function logDemoRun(
  req: Request,
  kind: "cached" | "live",
  school: string
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
    await supabase
      .from("demo_runs")
      .insert({ kind, school: school || null, ip_hash: ipHash });
  } catch {
    /* analytics must never break the demo */
  }
}
