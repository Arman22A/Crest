import assert from "node:assert/strict";
import test from "node:test";
import {
  HttpError,
  LIMITS,
  readJsonRequest,
  validateProgressPayload,
  validatePushSubscription,
  validateReminderDays,
  validateTimezone,
  validateUserAction
} from "../supabase/functions/_shared/validation.ts";

test("streamed requests stop at the byte limit without a content-length header", async () => {
  const chunk = new Uint8Array(700_000).fill(97);
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(chunk);
      controller.enqueue(chunk);
      controller.close();
    }
  });
  const request = new Request("https://example.test", {
    method: "POST",
    body,
    duplex: "half"
  });
  await assert.rejects(
    readJsonRequest(request, 1_000_000),
    (error) => error instanceof HttpError && error.status === 413 && error.code === "REQUEST_TOO_LARGE"
  );
});

const payload = () => ({
  schemaVersion: 34,
  theme: "light",
  activeWorkspace: "planning",
  calendars: [{ id: "tasks", name: "Tasks", icon: "list", color: "#286fb4", description: "Work", system: true }],
  taskTypes: [{ id: "work", name: "Work", color: "#286fb4", system: true }],
  calendarData: {
    tasks: {
      dayPlans: {
        "2026-08-26": {
          focus: "Ship safely",
          tasks: [{ id: "task-1", title: "Test", meta: "Local", type: "work" }],
          updatedAt: "2026-08-26T10:00:00.000Z"
        }
      },
      entries: {
        "2026-08-26": { tasks: { "task-1": true }, energy: 7, notes: "Done", updatedAt: "2026-08-26T11:00:00.000Z" }
      },
      updatedAt: "2026-08-26T11:00:00.000Z"
    }
  },
  dayPlans: {},
  goals: [],
  contentStudio: { name: "Content", items: [], templates: [], platforms: ["Reels"], pillars: ["Design"], updatedAt: "2026-08-26T11:00:00.000Z" }
});

test("accepts a bounded Crest payload", () => {
  assert.equal(validateProgressPayload(payload()).schemaVersion, 34);
});

test("rejects an unknown action", () => {
  assert.throws(() => validateUserAction({ action: "dispatch" }), (error) => error instanceof HttpError && error.code === "UNKNOWN_ACTION");
});

test("rejects payloads over the measured safety limit", () => {
  const value = payload();
  value.profilePhoto = `data:image/png;base64,${"A".repeat(LIMITS.payloadBytes)}`;
  assert.throws(() => validateProgressPayload(value), (error) => error instanceof HttpError && error.status === 413);
});

test("rejects invalid and accepts known timezones", () => {
  assert.equal(validateTimezone("Europe/Moscow"), "Europe/Moscow");
  assert.throws(() => validateTimezone("Mars/Olympus"), HttpError);
});

test("requires HTTPS and both Web Push keys", () => {
  assert.throws(() => validatePushSubscription({ endpoint: "http://push.test", keys: { p256dh: "A".repeat(40), auth: "B".repeat(16) } }), HttpError);
  assert.equal(
    validatePushSubscription({ endpoint: "https://push.test/sub", expirationTime: null, keys: { p256dh: "A".repeat(40), auth: "B".repeat(16) } }).endpoint,
    "https://push.test/sub"
  );
});

test("limits reminder-day count", () => {
  const days = {};
  for (let day = 1; day <= LIMITS.reminderDays + 1; day += 1) {
    days[`2026-09-${String(day).padStart(2, "0")}`] = { total: 0, incomplete: [] };
  }
  assert.throws(() => validateReminderDays(days), HttpError);
});

test("limits reminder-day bytes before database storage", () => {
  const days = {};
  for (let day = 1; day <= 20; day += 1) {
    const key = `2026-09-${String(day).padStart(2, "0")}`;
    days[key] = {
      total: 100,
      incomplete: Array.from({ length: 100 }, (_, index) => ({
        id: `task-${day}-${index}-${"x".repeat(220)}`,
        title: "y".repeat(160)
      }))
    };
  }
  assert.throws(
    () => validateReminderDays(days),
    (error) => error instanceof HttpError && error.status === 413 && error.code === "REMINDER_DAYS_TOO_LARGE"
  );
});
