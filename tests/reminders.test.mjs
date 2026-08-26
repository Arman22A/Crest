import assert from "node:assert/strict";
import test from "node:test";
import {
  dueNow,
  localClock,
  reminderPayload
} from "../supabase/functions/_shared/reminders.ts";

test("local clock respects the subscription timezone across midnight", () => {
  const instant = new Date("2026-08-25T21:30:00.000Z");
  assert.deepEqual(localClock(instant, "Europe/Moscow"), { date: "2026-08-26", time: "00:30" });
  assert.deepEqual(localClock(instant, "America/New_York"), { date: "2026-08-25", time: "17:30" });
});

test("a reminder is due only during its two-minute scheduler window", () => {
  assert.equal(dueNow("09:59", "10:00"), false);
  assert.equal(dueNow("10:00", "10:00"), true);
  assert.equal(dueNow("10:01", "10:00"), true);
  assert.equal(dueNow("10:02", "10:00"), false);
  assert.equal(dueNow("invalid", "10:00"), false);
});

test("neutral notifications never include private task titles", () => {
  const payload = reminderPayload(
    "morning",
    "2026-08-26",
    [{ title: "Private task" }, { title: "Another task" }],
    "neutral",
    "https://arman22a.github.io/Crest/"
  );
  assert.equal(payload.body, "На сегодня осталось задач: 2.");
  assert.equal(payload.body.includes("Private task"), false);
  assert.equal(payload.url, "https://arman22a.github.io/Crest/?date=2026-08-26");
});

test("detailed notifications include at most three bounded task titles", () => {
  const payload = reminderPayload(
    "evening",
    "2026-08-26",
    [
      { title: "One" },
      { title: "Two" },
      { title: "Three" },
      { title: "Four" }
    ],
    "detailed",
    "https://arman22a.github.io/Crest/index.html?source=pwa"
  );
  assert.equal(payload.body, "One, Two, Three и ещё 1.");
  assert.equal(payload.url, "https://arman22a.github.io/Crest/index.html?source=pwa&date=2026-08-26");
});
