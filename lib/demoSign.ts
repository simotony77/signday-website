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

// Richer payload for the "email me the full breakdown" flow. Carries the
// monitoring summary + trigger so the lead email can recreate the demo the
// prospect actually saw, while still preventing tampering: the server signs
// this payload, refuses to email anything whose signature doesn't match.
export interface DemoLeadPayload {
  school_name: string;
  subject: string;
  body: string;
  trigger: string;
  head_coach?: string | null;
  graduating_seniors?: { name: string; position: string; class_year: string }[];
  recent_results?: {
    result: string | null;
    opponent: string;
    date: string | null;
    is_win?: boolean;
  }[];
  record?: string | null;
}

function canonicalLead(p: DemoLeadPayload): string {
  return [
    p.school_name || "",
    p.subject || "",
    p.body || "",
    p.trigger || "",
    p.head_coach || "",
    p.record || "",
    (p.graduating_seniors || [])
      .map((s) => `${s.name}|${s.position}|${s.class_year}`)
      .join("\n"),
    (p.recent_results || [])
      .map(
        (r) =>
          `${r.result || ""}|${r.opponent || ""}|${r.date || ""}|${r.is_win ? "W" : ""}`
      )
      .join("\n"),
  ].join("\n=====\n");
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

export function signDemoLead(payload: DemoLeadPayload): string | null {
  const key = secret();
  if (!key) return null;
  return createHmac("sha256", key)
    .update(canonicalLead(payload))
    .digest("base64url");
}

export function verifyDemoLead(payload: DemoLeadPayload, sig: string): boolean {
  const key = secret();
  if (!key || !sig) return false;
  const expected = createHmac("sha256", key)
    .update(canonicalLead(payload))
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
