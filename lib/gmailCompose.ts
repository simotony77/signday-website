// Build a Gmail "compose" deep-link prefilled with subject/body (and optionally
// a recipient). Opening it drops the athlete straight into Gmail with the draft
// ready to review, tweak, and send from their own account — no copy/paste of
// the whole email. Works on desktop and mobile Gmail web.
export function gmailComposeUrl(opts: {
  to?: string;
  subject: string;
  body: string;
}): string {
  const parts = [
    "view=cm",
    "fs=1",
    opts.to ? `to=${encodeURIComponent(opts.to)}` : "",
    `su=${encodeURIComponent(opts.subject)}`,
    `body=${encodeURIComponent(opts.body)}`,
  ].filter(Boolean);
  return `https://mail.google.com/mail/?${parts.join("&")}`;
}
