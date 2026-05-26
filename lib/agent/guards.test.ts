// Regression tests for the guards that stop a flaky scrape from turning into a
// flood of bogus coach drafts (the "Brown 17-removals, 19-drafts" incident).
//
// Run: npm test
//
// These cover pure logic only (no network, no API): the degraded-roster guard,
// the de-duper, and the single-outreach-trigger chooser.

import { test } from "node:test";
import assert from "node:assert/strict";
import { isDegradedRoster, chooseOutreachTrigger } from "./run";
import { dedupeRoster, normNameKey } from "./scrape";
import type { SchoolData, DiffOutput } from "./types";

// ---- helpers ----
function emptyDiff(over: Partial<DiffOutput> = {}): DiffOutput {
  return {
    team: "Test U",
    generated_at: "2026-01-01T00:00:00.000Z",
    players_added: [],
    players_removed: [],
    coaches_added: [],
    coaches_removed: [],
    head_coach_changed: null,
    triggers: [],
    ...over,
  };
}

// ---- isDegradedRoster: the core safety net ----
test("isDegradedRoster: clean week is trusted", () => {
  assert.equal(isDegradedRoster(28, 0, 28), false);
  assert.equal(isDegradedRoster(28, 2, 27), false); // small churn is normal
});

test("isDegradedRoster: the Brown blow-up is rejected", () => {
  // 17 of 28 players vanish in a week -> almost certainly a partial scrape.
  assert.equal(isDegradedRoster(28, 17, 11), true);
});

test("isDegradedRoster: an implausibly small re-read is rejected", () => {
  // Roster collapses below 60% of last week even if 'removed' looks modest.
  assert.equal(isDegradedRoster(20, 0, 11), true);
});

test("isDegradedRoster: tiny baselines are never flagged", () => {
  // We don't trust the guard until we have a real (>=12) baseline to compare.
  assert.equal(isDegradedRoster(10, 8, 2), false);
});

test("isDegradedRoster: just under thresholds stays trusted", () => {
  // 6 removed of 20 = exactly 30% (not > 30%), 14 left (> 60% of 20) -> trust.
  assert.equal(isDegradedRoster(20, 6, 14), false);
});

// ---- dedupeRoster: pages that render the roster twice ----
test("dedupeRoster: collapses duplicate players (formatting drift)", () => {
  const data: SchoolData = {
    team: "Test U",
    season: 2026,
    roster: [
      { name: "John Smith", position: "GK", class_year: "Sr." },
      { name: "john  smith", position: "GK", class_year: "Sr." }, // dupe
      { name: "Mary Jones", position: "MF", class_year: "Jr." },
    ],
    coaching_staff: [],
  };
  assert.equal(dedupeRoster(data).roster.length, 2);
});

test("dedupeRoster: collapses duplicate coaches by name+title", () => {
  const data: SchoolData = {
    team: "Test U",
    season: 2026,
    roster: [],
    coaching_staff: [
      { name: "Pat Lee", title: "Head Coach" },
      { name: "Pat Lee", title: "Head Coach" }, // dupe
      { name: "Pat Lee", title: "Assistant Coach" }, // same person, diff role: keep
    ],
  };
  assert.equal(dedupeRoster(data).coaching_staff.length, 2);
});

test("normNameKey: normalizes accents and punctuation", () => {
  assert.equal(normNameKey("José García-López"), normNameKey("Jose Garcia Lopez"));
});

// ---- chooseOutreachTrigger: at most ONE real reason, never roster noise ----
test("chooseOutreachTrigger: a recent win wins over everything", () => {
  const diff = emptyDiff({ head_coach_changed: { from: "A", to: "B" } });
  const t = chooseOutreachTrigger(diff, ["Won 3-1 vs Rival. Reach out now."]);
  assert.match(t || "", /Won 3-1/);
});

test("chooseOutreachTrigger: head coach change when no win", () => {
  const diff = emptyDiff({ head_coach_changed: { from: "Old Coach", to: "New Coach" } });
  const t = chooseOutreachTrigger(diff, []);
  assert.match(t || "", /Head coach changed/);
});

test("chooseOutreachTrigger: a new assistant coach is a valid reason", () => {
  const diff = emptyDiff({
    coaches_added: [{ name: "Sam Rivera", title: "Assistant Coach" }],
  });
  const t = chooseOutreachTrigger(diff, []);
  assert.match(t || "", /Sam Rivera/);
});

test("chooseOutreachTrigger: silence re-engagement is the lowest-priority fallback", () => {
  // With nothing else, a silence note becomes the trigger.
  assert.match(
    chooseOutreachTrigger(emptyDiff(), [], "It has been 25 days, re-engage.") || "",
    /re-engage/i
  );
  // But a real win still outranks silence.
  assert.match(
    chooseOutreachTrigger(emptyDiff(), ["Won 2-0 vs Rival."], "re-engage") || "",
    /Won 2-0/
  );
  // No silence + nothing else = no draft.
  assert.equal(chooseOutreachTrigger(emptyDiff(), [], null), null);
});

test("chooseOutreachTrigger: player add/remove NEVER triggers a draft", () => {
  const diff = emptyDiff({
    players_added: [{ name: "New Kid", position: "FW", class_year: "Fr." }],
    players_removed: [
      { name: "Gone One", position: "DF", class_year: "Sr." },
      { name: "Gone Two", position: "MF", class_year: "Sr." },
    ],
    triggers: ["New player on roster...", "Player removed from roster..."],
  });
  assert.equal(chooseOutreachTrigger(diff, []), null);
});
