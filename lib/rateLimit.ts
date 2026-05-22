import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (cached) return cached;
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cached = createClient(url, key);
  return cached;
}

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * Sliding-window rate limit backed by Supabase, keyed by endpoint + IP.
 *
 * Fails OPEN: if the rate-limit store is unavailable, we allow the request
 * rather than break the endpoint for everyone. The goal here is to blunt
 * casual abuse / runaway cost, not to be a hard security boundary.
 */
export async function rateLimit(
  req: Request,
  endpoint: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const supabase = getSupabase();
  if (!supabase) return { allowed: true, remaining: limit };

  const ip = clientIp(req);
  const bucket = `${endpoint}:${ip}`;
  const sinceIso = new Date(Date.now() - windowSeconds * 1000).toISOString();

  try {
    const { count, error } = await supabase
      .from("rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("bucket", bucket)
      .gte("created_at", sinceIso);

    if (error) return { allowed: true, remaining: limit }; // fail open

    const used = count ?? 0;
    if (used >= limit) {
      return { allowed: false, remaining: 0 };
    }

    // Record this hit. Best-effort; don't block on the insert result.
    await supabase.from("rate_limits").insert({ bucket });

    // Opportunistic prune of this bucket's expired rows (keeps table small).
    void supabase
      .from("rate_limits")
      .delete()
      .eq("bucket", bucket)
      .lt("created_at", sinceIso);

    return { allowed: true, remaining: Math.max(0, limit - used - 1) };
  } catch {
    return { allowed: true, remaining: limit }; // fail open
  }
}
