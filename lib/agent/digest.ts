import type { Draft } from "./types";
import { gmailComposeUrl } from "../gmailCompose";

// Result of running the agent against one school for one customer this week.
export interface SchoolResult {
  school_name: string;
  roster_url: string;
  is_baseline: boolean; // first time we've scraped this school for this customer
  error?: string; // set if scraping/parsing failed
  triggers: string[]; // human-readable change descriptions
  drafts: (Draft & { trigger: string; coach: string; coach_email?: string | null })[];
  roster_size?: number;
  head_coach?: string | null;
}

export interface DigestInput {
  athlete_name: string;
  results: SchoolResult[];
  referral_link?: string;
  // Optional time-sensitive nudge, e.g. "4 weeks until the New England ID Camp."
  camp_note?: string;
  // Schools the parent marked 'sent' that have gone quiet (no reply logged).
  quiet_schools?: { school: string; days: number }[];
  // Tokened link to the school tracker, so they can update statuses.
  tracker_link?: string;
  // Compact per-school status board (only when the parent has used the tracker).
  tracker_summary?: {
    school: string;
    status: string;
    days_silent: number | null;
    agent_note?: string | null;
  }[];
}

const STATUS_LABEL: Record<string, string> = {
  not_contacted: "Not contacted",
  sent: "Awaiting reply",
  replied: "Replied",
  visit: "Visit invite",
  not_pursuing: "Not pursuing",
};

function statusLine(s: {
  status: string;
  days_silent: number | null;
  agent_note?: string | null;
}): string {
  let label = STATUS_LABEL[s.status] || s.status;
  if (s.status === "sent" && s.days_silent !== null) {
    label = `Awaiting reply (${s.days_silent}d)`;
  }
  if (s.agent_note) label += ` — ${s.agent_note}`;
  return label;
}

export interface BuiltDigest {
  subject: string;
  html: string;
  text: string;
  is_baseline: boolean;
  schools_tracked: number;
  triggers_count: number;
  drafts_count: number;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildDigest(input: DigestInput): BuiltDigest {
  const {
    athlete_name,
    results,
    referral_link,
    camp_note,
    quiet_schools,
    tracker_link,
    tracker_summary,
  } = input;

  const ok = results.filter((r) => !r.error);
  const failed = results.filter((r) => r.error);
  const allBaseline = ok.length > 0 && ok.every((r) => r.is_baseline);
  const triggersCount = ok.reduce((n, r) => n + r.triggers.length, 0);
  const draftsCount = ok.reduce((n, r) => n + r.drafts.length, 0);
  const schoolsTracked = results.length;

  // ---- Subject ----
  let subject: string;
  if (allBaseline) {
    subject = `SignDay is now watching ${schoolsTracked} school${schoolsTracked === 1 ? "" : "s"} for ${athlete_name}`;
  } else if (draftsCount > 0) {
    subject = `SignDay weekly digest: ${draftsCount} draft${draftsCount === 1 ? "" : "s"} ready for ${athlete_name}`;
  } else {
    subject = `SignDay weekly digest: quiet week for ${athlete_name}`;
  }

  // ---- Text body ----
  const t: string[] = [];
  t.push("Hi,\n");
  if (camp_note) t.push(`${camp_note}\n`);
  if (allBaseline) {
    t.push(
      `Setup complete. SignDay is now monitoring ${schoolsTracked} program${schoolsTracked === 1 ? "" : "s"} for ${athlete_name} every week:\n`
    );
    for (const r of ok) {
      t.push(`  - ${r.school_name}${r.roster_size ? ` (${r.roster_size} on roster${r.head_coach ? `, HC ${r.head_coach}` : ""})` : ""}`);
    }
    t.push(
      `\nThis is your baseline week. Starting next Sunday, you'll get drafts whenever a roster or coaching change opens a door at any of these programs.`
    );
  } else if (draftsCount > 0) {
    t.push(
      `Here's what changed across the ${schoolsTracked} program${schoolsTracked === 1 ? "" : "s"} I'm watching for ${athlete_name}, and the drafts ready for your approval.\n`
    );
    for (const r of ok) {
      if (r.triggers.length === 0) continue;
      t.push(`${r.school_name.toUpperCase()}`);
      for (const trig of r.triggers) t.push(`  - ${trig}`);
      r.drafts.forEach((d, i) => {
        t.push("");
        t.push(`  Draft ${i + 1} -> ${d.coach}`);
        t.push(`  Subject: ${d.subject}`);
        const bodyLines = d.body.split("\n");
        for (const line of bodyLines) t.push(`    ${line}`);
        t.push(`    Open in Gmail: ${gmailComposeUrl({ to: d.coach_email || undefined, subject: d.subject, body: d.body })}`);
      });
      t.push("");
    }
    // Show the agent's work on every other tracked school so a quiet week
    // still reads like "I watched all your schools for you," not silence.
    const quietWatched = ok.filter((r) => r.triggers.length === 0 && !r.is_baseline);
    if (quietWatched.length > 0) {
      t.push("ALSO WATCHED THIS WEEK (no changes detected):");
      for (const r of quietWatched) {
        const parts: string[] = [];
        if (r.roster_size) parts.push(`${r.roster_size} on roster`);
        if (r.head_coach) parts.push(`HC ${r.head_coach}`);
        t.push(`  - ${r.school_name}${parts.length ? ` (${parts.join(", ")})` : ""}`);
      }
      t.push("");
    }
    t.push(
      `Reply to this email to approve, tweak, or skip any draft. Once you're happy, send it from ${athlete_name}'s Gmail so it lands as a real personal email.`
    );
  } else {
    t.push(
      `Quiet week. I checked all ${schoolsTracked} program${schoolsTracked === 1 ? "" : "s"} I'm watching for ${athlete_name} and nothing changed on the rosters or coaching staffs. No action needed.\n`
    );
    t.push(`Schools watched this week:`);
    for (const r of ok) t.push(`  - ${r.school_name}`);
    t.push(`\nI'll keep watching and ping you the moment something opens up.`);
  }

  if (tracker_summary && tracker_summary.length > 0) {
    t.push(`\nYour tracker:`);
    for (const s of tracker_summary) t.push(`  - ${s.school}: ${statusLine(s)}`);
  }

  if (quiet_schools && quiet_schools.length > 0) {
    t.push(`\nSchools that have gone quiet (no reply logged yet):`);
    for (const q of quiet_schools)
      t.push(`  - ${q.school}: ${q.days} days since your last email. Worth a re-engagement.`);
  }

  if (failed.length > 0) {
    t.push(`\nHeads up, I couldn't read these pages this week (I'll retry next run):`);
    for (const r of failed) t.push(`  - ${r.school_name}: ${r.error}`);
  }
  if (tracker_link) {
    t.push(
      `\nUpdate your school tracker (mark replies, visits, and who's gone quiet so next week's digest is sharper): ${tracker_link}`
    );
  }
  if (referral_link) {
    t.push(
      `\nKnow another family drowning in this? Forward them your link: ${referral_link}\nWhen they subscribe, you both get your next month free.`
    );
  }
  t.push("\nTony @ SignDay");

  // ---- HTML body ----
  const h: string[] = [];
  h.push(
    `<div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #111827;">`
  );
  h.push(`<h2 style="margin: 0 0 4px;">SignDay weekly digest</h2>`);
  h.push(
    `<div style="color:#6B7280; font-size: 14px; margin-bottom: 24px;">${escapeHtml(athlete_name)} &middot; ${schoolsTracked} school${schoolsTracked === 1 ? "" : "s"} watched</div>`
  );
  if (camp_note) {
    h.push(
      `<div style="background:#FEF3C7; border:1px solid #FDE68A; color:#92400E; font-size:14px; padding:10px 14px; border-radius:10px; margin-bottom:20px;">${escapeHtml(camp_note)}</div>`
    );
  }

  if (allBaseline) {
    h.push(
      `<p style="line-height:1.6;">Setup complete. SignDay is now monitoring these programs every week:</p>`
    );
    h.push(`<ul style="line-height:1.7; padding-left:20px;">`);
    for (const r of ok) {
      h.push(
        `<li>${escapeHtml(r.school_name)}${r.roster_size ? ` <span style="color:#6B7280;">(${r.roster_size} on roster${r.head_coach ? `, HC ${escapeHtml(r.head_coach)}` : ""})</span>` : ""}</li>`
      );
    }
    h.push(`</ul>`);
    h.push(
      `<p style="line-height:1.6; color:#374151;">This is your baseline week. Starting next Sunday you'll get drafts whenever a roster or coaching change opens a door.</p>`
    );
  } else if (draftsCount > 0) {
    h.push(
      `<p style="line-height:1.6;">Here's what changed this week and the drafts ready for your approval.</p>`
    );
    for (const r of ok) {
      if (r.triggers.length === 0) continue;
      h.push(
        `<h3 style="margin-top:28px; font-size:15px; border-bottom:1px solid #E5E7EB; padding-bottom:6px;">${escapeHtml(r.school_name)}</h3>`
      );
      h.push(`<ul style="line-height:1.6; padding-left:20px; color:#374151;">`);
      for (const trig of r.triggers) h.push(`<li>${escapeHtml(trig)}</li>`);
      h.push(`</ul>`);
      for (const d of r.drafts) {
        h.push(
          `<div style="margin:16px 0; padding:16px; border-left:3px solid #1A56DB; background:#F9FAFB;">`
        );
        h.push(
          `<div style="font-size:12px;color:#6B7280;">To: ${escapeHtml(d.coach)}</div>`
        );
        h.push(
          `<div style="font-weight:600;color:#111827;margin-top:2px;">${escapeHtml(d.subject)}</div>`
        );
        h.push(
          `<pre style="font-family: ui-monospace, Menlo, monospace; font-size: 13px; white-space: pre-wrap; margin-top: 12px; padding: 12px; background:#fff; border:1px solid #E5E7EB; border-radius: 6px;">${escapeHtml(d.body)}</pre>`
        );
        h.push(
          `<a href="${gmailComposeUrl({ to: d.coach_email || undefined, subject: d.subject, body: d.body }).replace(/&/g, "&amp;")}" style="display:inline-block; margin-top:10px; background:#1A56DB; color:#fff; text-decoration:none; font-weight:600; font-size:13px; padding:8px 14px; border-radius:8px;">Open in Gmail to edit &amp; send</a>`
        );
        h.push(`</div>`);
      }
    }
    // Show the agent's work on every other tracked school so a quiet week
    // still reads like "I watched all your schools for you," not silence.
    const quietWatched = ok.filter((r) => r.triggers.length === 0 && !r.is_baseline);
    if (quietWatched.length > 0) {
      h.push(
        `<h3 style="margin-top:28px; font-size:15px; border-bottom:1px solid #E5E7EB; padding-bottom:6px; color:#6B7280;">Also watched this week (no changes detected)</h3>`
      );
      h.push(`<ul style="line-height:1.7; padding-left:20px; color:#6B7280;">`);
      for (const r of quietWatched) {
        const parts: string[] = [];
        if (r.roster_size) parts.push(`${r.roster_size} on roster`);
        if (r.head_coach) parts.push(`HC ${escapeHtml(r.head_coach)}`);
        h.push(
          `<li>${escapeHtml(r.school_name)}${parts.length ? ` <span style="color:#9CA3AF;">(${parts.join(", ")})</span>` : ""}</li>`
        );
      }
      h.push(`</ul>`);
    }
    h.push(
      `<p style="color:#374151; font-size: 14px; margin-top: 24px;">Reply to approve, tweak, or skip any draft. When you're happy, send it from ${escapeHtml(athlete_name)}'s Gmail so it reads as a real personal email.</p>`
    );
  } else {
    h.push(
      `<p style="line-height:1.6;">Quiet week. I checked every program I'm watching and nothing changed on the rosters or coaching staffs. No action needed.</p>`
    );
    h.push(`<ul style="line-height:1.7; padding-left:20px; color:#6B7280;">`);
    for (const r of ok) h.push(`<li>${escapeHtml(r.school_name)}</li>`);
    h.push(`</ul>`);
    h.push(
      `<p style="color:#374151; font-size:14px;">I'll keep watching and ping you the moment something opens up.</p>`
    );
  }

  if (tracker_summary && tracker_summary.length > 0) {
    h.push(
      `<h3 style="margin-top:28px; font-size:15px; border-bottom:1px solid #E5E7EB; padding-bottom:6px;">Your tracker</h3>`
    );
    h.push(`<ul style="line-height:1.6; padding-left:20px; color:#374151;">`);
    for (const s of tracker_summary)
      h.push(`<li><b>${escapeHtml(s.school)}</b>: ${escapeHtml(statusLine(s))}</li>`);
    h.push(`</ul>`);
  }

  if (quiet_schools && quiet_schools.length > 0) {
    h.push(
      `<h3 style="margin-top:28px; font-size:15px; border-bottom:1px solid #E5E7EB; padding-bottom:6px;">Gone quiet (no reply logged yet)</h3>`
    );
    h.push(`<ul style="line-height:1.6; padding-left:20px; color:#374151;">`);
    for (const q of quiet_schools)
      h.push(
        `<li>${escapeHtml(q.school)}: ${q.days} days since your last email. Worth a re-engagement.</li>`
      );
    h.push(`</ul>`);
  }

  if (failed.length > 0) {
    h.push(
      `<p style="color:#B45309; font-size:13px; margin-top:24px;">Couldn't read these pages this week (will retry next run):</p>`
    );
    h.push(`<ul style="color:#B45309; font-size:13px; padding-left:20px;">`);
    for (const r of failed)
      h.push(`<li>${escapeHtml(r.school_name)}: ${escapeHtml(r.error || "")}</li>`);
    h.push(`</ul>`);
  }

  if (tracker_link) {
    h.push(
      `<p style="color:#374151; font-size: 13px; margin-top: 24px;"><a href="${escapeHtml(tracker_link)}" style="color:#1A56DB;">Update your school tracker</a> — mark replies, visits, and who's gone quiet so next week's digest is sharper.</p>`
    );
  }
  if (referral_link) {
    h.push(
      `<p style="color:#374151; font-size: 13px; margin-top: 24px; padding-top:16px; border-top:1px solid #E5E7EB;">Know another family drowning in this? <a href="${escapeHtml(referral_link)}" style="color:#1A56DB;">Forward them your link</a>. When they subscribe, you both get your next month free.</p>`
    );
  }
  h.push(
    `<p style="color:#9CA3AF; font-size: 12px; margin-top: 28px;">Tony @ SignDay &middot; <a href="https://www.signdayapp.com/account" style="color:#9CA3AF;">manage subscription</a></p>`
  );
  h.push(`</div>`);

  return {
    subject,
    html: h.join("\n"),
    text: t.join("\n"),
    is_baseline: allBaseline,
    schools_tracked: schoolsTracked,
    triggers_count: triggersCount,
    drafts_count: draftsCount,
  };
}
