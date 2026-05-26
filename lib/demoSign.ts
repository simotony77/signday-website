import { createHmac, timingSafeEqual } from "node:crypto";

// Signs demo-generated drafts so /api/demo-lead will only email content that
// SignDay actually produced. Without this, the lead endpoint would be an open
// relay: anyone could POST arbitrary subject/body and have it sent from our
// verified domain to any address. The signature proves the draft came from a
// real demo run. Stateless (HMAC), reusing the existing ACCESS_TOKEN_SECRET.

function secret(): string | null {
  return process.env.ACCESS_TOKEN_SECRET || null;
}

function canonical(subject: string, body: string, school: string): string {
  return `${school}\n${subject}\n${body}`;
}

export function demoSigningEnabled(): boolean {
  return !!secret();
}

// Returns a signature for a draft, or null if no secret is configured.
export function signDemoDraft(
  subject: string,
  body: string,
  school: string
): string | null {
  const key = secret();
  if (!key) return null;
  return createHmac("sha256", key)
    .update(canonical(subject, body, school))
    .digest("base64url");
}

export function verifyDemoDraft(
  subject: string,
  body: string,
  school: string,
  sig: string
): boolean {
  const key = secret();
  if (!key || !sig) return false;
  const expected = createHmac("sha256", key)
    .update(canonical(subject, body, school))
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
