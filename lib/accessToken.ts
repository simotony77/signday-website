import { createHmac, timingSafeEqual } from "node:crypto";

// Stateless, signed access tokens. A token proves the holder controls the
// email it was issued for (because it was emailed to that address). No DB
// needed: the token carries email + expiry, signed with ACCESS_TOKEN_SECRET.
//
// Used to gate endpoints that expose a customer's (and their minor athlete's)
// PII or billing actions: /api/onboarding/load, /api/onboarding (submit),
// /api/billing-portal.

function secret(): string | null {
  return process.env.ACCESS_TOKEN_SECRET || null;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

// Mint a token for an email, valid for ttlSeconds. Returns null if no secret
// is configured (caller should treat that as "tokens disabled").
export function mintAccessToken(
  email: string,
  ttlSeconds: number
): string | null {
  const key = secret();
  if (!key) return null;
  const exp = Date.now() + ttlSeconds * 1000;
  const payload = `${email.trim().toLowerCase()}|${exp}`;
  const sig = sign(payload, key);
  const payloadB64 = Buffer.from(payload).toString("base64url");
  return `${payloadB64}.${sig}`;
}

// Verify a token belongs to email and hasn't expired. Constant-time compare.
export function verifyAccessToken(email: string, token: string): boolean {
  const key = secret();
  if (!key || !token) return false;
  try {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return false;
    const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
    const [tokenEmail, expStr] = payload.split("|");
    if (tokenEmail !== email.trim().toLowerCase()) return false;
    const exp = Number(expStr);
    if (!exp || Date.now() > exp) return false;
    const expected = sign(payload, key);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// True if token gating is configured. If ACCESS_TOKEN_SECRET is unset we treat
// the system as not-yet-enabled so endpoints can degrade gracefully rather
// than locking everyone out before the env var is set.
export function accessTokensEnabled(): boolean {
  return !!secret();
}
