import { randomBytes } from "node:crypto";

// Short, URL-safe, human-shareable referral code. 8 chars from a base32-ish
// alphabet (no ambiguous 0/O/1/I) = ~40 bits, plenty for our scale.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function generateReferralCode(len = 8): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function referralLink(origin: string, code: string): string {
  return `${origin}/?ref=${encodeURIComponent(code)}`;
}
