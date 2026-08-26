export const LIMITS = Object.freeze({
  requestBytes: 1_200_000,
  payloadBytes: 1_048_576,
  jsonDepth: 12,
  jsonNodes: 25_000,
  calendars: 20,
  taskTypes: 50,
  dayRecords: 5_000,
  tasksPerDay: 100,
  totalTasks: 10_000,
  taskTitle: 160,
  taskMeta: 1_500,
  focus: 1_000,
  notes: 20_000,
  profilePhoto: 600_000,
  goals: 100,
  contentItems: 1_000,
  contentTemplates: 200,
  contentText: 20_000,
  reminderDaysBytes: 262_144,
  reminderDays: 60,
  remindersPerDay: 100
});

const USER_ACTIONS = new Set(["pull", "push", "subscribe", "unsubscribe", "test_notification"]);
const TOP_LEVEL_FIELDS = new Set([
  "activeCalendarId", "activeCalendarUpdatedAt", "activeWorkspace", "calendarData",
  "calendars", "calendarsUpdatedAt", "contentStudio", "contentStudioUpdatedAt",
  "dayPlans", "goals", "goalsUpdatedAt", "localUpdatedAt", "lockedDays",
  "notificationPrivacy", "profileName", "profilePhoto", "profilePhotoVersion", "profileUpdatedAt",
  "reminderEvening", "reminderMorning", "reminderTimezone", "reminderUpdatedAt",
  "schemaVersion", "taskTypes", "taskTypesUpdatedAt", "theme", "themeUpdatedAt",
  "useStarterTemplate"
]);
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const ID = /^[A-Za-z0-9:_-]{1,128}$/;
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T/;
const encoder = new TextEncoder();

export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

export async function readJsonRequest(request: Request, maxBytes = LIMITS.requestBytes) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new HttpError(413, "REQUEST_TOO_LARGE", "Request is too large");
  }

  const reader = request.body?.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let raw = "";
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, "REQUEST_TOO_LARGE", "Request is too large");
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
  }

  try {
    return expectObject(JSON.parse(raw || "{}"), "request body");
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "INVALID_JSON", "Request body must be valid JSON");
  }
}

export function validateUserAction(body: Record<string, unknown>) {
  const action = expectString(body.action, "action", 32);
  if (!USER_ACTIONS.has(action)) {
    throw new HttpError(400, "UNKNOWN_ACTION", "Unknown action");
  }
  if (action === "pull") {
    expectOnlyKeys(body, ["action"], "pull request");
    return { action } as const;
  }
  if (action === "push") {
    expectOnlyKeys(body, ["action", "baseRevision", "payload", "reminderDays"], "push request");
    const baseRevision = expectInteger(body.baseRevision, "baseRevision", 0, Number.MAX_SAFE_INTEGER);
    const payload = validateProgressPayload(body.payload);
    const reminderDays = body.reminderDays === undefined ? undefined : validateReminderDays(body.reminderDays);
    return { action, baseRevision, payload, reminderDays } as const;
  }
  if (action === "subscribe") {
    expectOnlyKeys(
      body,
      ["action", "subscription", "deviceName", "timezone", "morningTime", "eveningTime", "reminderDays", "privacyMode"],
      "subscribe request"
    );
    return {
      action,
      subscription: validatePushSubscription(body.subscription),
      deviceName: expectString(body.deviceName, "deviceName", 80),
      timezone: validateTimezone(body.timezone),
      morningTime: validateTime(body.morningTime, "morningTime"),
      eveningTime: validateTime(body.eveningTime, "eveningTime"),
      reminderDays: validateReminderDays(body.reminderDays),
      privacyMode: validatePrivacyMode(body.privacyMode)
    } as const;
  }
  if (action === "unsubscribe") {
    expectOnlyKeys(body, ["action", "endpoint"], "unsubscribe request");
    return { action, endpoint: validateEndpoint(body.endpoint) } as const;
  }

  expectOnlyKeys(body, ["action", "endpoint"], "test notification request");
  return { action, endpoint: validateEndpoint(body.endpoint) } as const;
}

export function validateCronAction(body: Record<string, unknown>) {
  expectOnlyKeys(body, ["action"], "cron request");
  if (body.action !== "dispatch") throw new HttpError(400, "UNKNOWN_ACTION", "Unknown action");
  return { action: "dispatch" as const };
}

export function validateProgressPayload(value: unknown) {
  const payload = expectObject(value, "payload");
  if (encoder.encode(JSON.stringify(payload)).byteLength > LIMITS.payloadBytes) {
    throw new HttpError(413, "PAYLOAD_TOO_LARGE", "Progress payload is too large");
  }
  validateJsonComplexity(payload);
  for (const key of Object.keys(payload)) {
    if (!TOP_LEVEL_FIELDS.has(key) && !DATE_KEY.test(key)) {
      throw invalid(`payload contains an unsupported field: ${key}`);
    }
  }

  optionalString(payload.activeCalendarId, "activeCalendarId", 128);
  optionalEnum(payload.activeWorkspace, "activeWorkspace", ["planning", "content"]);
  optionalEnum(payload.theme, "theme", ["light", "knight"]);
  optionalEnum(payload.notificationPrivacy, "notificationPrivacy", ["neutral", "detailed"]);
  optionalString(payload.profileName, "profileName", 100);
  optionalProfilePhoto(payload.profilePhoto);
  optionalInteger(payload.profilePhotoVersion, "profilePhotoVersion", 0, 1_000_000);
  optionalInteger(payload.schemaVersion, "schemaVersion", 0, 10_000);
  optionalBoolean(payload.useStarterTemplate, "useStarterTemplate");
  optionalTime(payload.reminderMorning, "reminderMorning");
  optionalTime(payload.reminderEvening, "reminderEvening");
  if (payload.reminderTimezone !== undefined) validateTimezone(payload.reminderTimezone);

  for (const field of Object.keys(payload).filter((key) => key.endsWith("UpdatedAt") || key === "localUpdatedAt")) {
    optionalTimestamp(payload[field], field);
  }

  validateCalendars(payload.calendars);
  validateTaskTypes(payload.taskTypes);
  validateGoals(payload.goals);
  const counters = { dayRecords: 0, tasks: 0 };
  validateDayPlans(payload.dayPlans, "dayPlans", counters);
  validateCalendarData(payload.calendarData, counters);
  for (const [key, entry] of Object.entries(payload)) {
    if (DATE_KEY.test(key)) validateEntry(entry, `payload.${key}`);
  }
  if (counters.dayRecords > LIMITS.dayRecords) throw invalid("too many day records");
  if (counters.tasks > LIMITS.totalTasks) throw invalid("too many tasks");
  if (payload.lockedDays !== undefined) expectObject(payload.lockedDays, "lockedDays");
  validateContentStudio(payload.contentStudio);
  return payload;
}

export function validateTimezone(value: unknown) {
  const timezone = expectString(value, "timezone", 100);
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(new Date(0));
  } catch {
    throw invalid("timezone is not recognized");
  }
  return timezone;
}

export function safeTimezone(value: unknown, fallback = "Europe/Moscow") {
  try {
    return validateTimezone(value);
  } catch {
    return fallback;
  }
}

export function validateReminderDays(value: unknown) {
  const days = expectObject(value, "reminderDays");
  if (encoder.encode(JSON.stringify(days)).byteLength > LIMITS.reminderDaysBytes) {
    throw new HttpError(413, "REMINDER_DAYS_TOO_LARGE", "Reminder data is too large");
  }
  const keys = Object.keys(days);
  if (keys.length > LIMITS.reminderDays) throw invalid("too many reminder days");
  for (const key of keys) {
    validateDateKey(key, "reminder day");
    const day = expectObject(days[key], `reminderDays.${key}`);
    expectOnlyKeys(day, ["total", "incomplete"], `reminderDays.${key}`);
    expectInteger(day.total, `reminderDays.${key}.total`, 0, 10_000);
    const incomplete = expectArray(day.incomplete, `reminderDays.${key}.incomplete`, LIMITS.remindersPerDay);
    for (const [index, taskValue] of incomplete.entries()) {
      const task = expectObject(taskValue, `reminderDays.${key}.incomplete[${index}]`);
      expectOnlyKeys(task, ["id", "title"], "reminder task");
      expectString(task.id, "reminder task id", 256);
      expectString(task.title, "reminder task title", LIMITS.taskTitle);
    }
  }
  return days;
}

export function validatePushSubscription(value: unknown) {
  const subscription = expectObject(value, "subscription");
  expectOnlyKeys(subscription, ["endpoint", "expirationTime", "keys"], "subscription");
  const endpoint = validateEndpoint(subscription.endpoint);
  if (subscription.expirationTime !== null && subscription.expirationTime !== undefined) {
    expectInteger(subscription.expirationTime, "expirationTime", 0, Number.MAX_SAFE_INTEGER);
  }
  const keys = expectObject(subscription.keys, "subscription.keys");
  expectOnlyKeys(keys, ["p256dh", "auth"], "subscription.keys");
  const p256dh = expectBase64Url(keys.p256dh, "p256dh", 32, 256);
  const auth = expectBase64Url(keys.auth, "auth", 8, 128);
  return { endpoint, expirationTime: subscription.expirationTime ?? null, keys: { p256dh, auth } };
}

export function validatePrivacyMode(value: unknown) {
  if (value === undefined) return "neutral";
  if (value !== "neutral" && value !== "detailed") throw invalid("privacyMode is invalid");
  return value;
}

export function validateEndpoint(value: unknown) {
  const endpoint = expectString(value, "endpoint", 2048);
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw invalid("endpoint is invalid");
  }
  if (parsed.protocol !== "https:") throw invalid("endpoint must use HTTPS");
  return endpoint;
}

export function validateTime(value: unknown, field: string) {
  const text = expectString(value, field, 5);
  if (!TIME.test(text)) throw invalid(`${field} is invalid`);
  return text;
}

function validateCalendars(value: unknown) {
  if (value === undefined) return;
  const list = expectArray(value, "calendars", LIMITS.calendars);
  for (const [index, raw] of list.entries()) {
    const item = expectObject(raw, `calendars[${index}]`);
    expectOnlyKeys(item, ["id", "name", "icon", "color", "description", "system"], "calendar");
    expectId(item.id, "calendar id");
    expectString(item.name, "calendar name", 80);
    expectString(item.icon, "calendar icon", 32);
    expectColor(item.color, "calendar color");
    optionalString(item.description, "calendar description", 240);
    optionalBoolean(item.system, "calendar system flag");
  }
}

function validateTaskTypes(value: unknown) {
  if (value === undefined) return;
  const list = expectArray(value, "taskTypes", LIMITS.taskTypes);
  for (const raw of list) {
    const item = expectObject(raw, "task type");
    expectOnlyKeys(item, ["id", "name", "color", "system"], "task type");
    expectId(item.id, "task type id");
    expectString(item.name, "task type name", 80);
    expectColor(item.color, "task type color");
    optionalBoolean(item.system, "task type system flag");
  }
}

function validateGoals(value: unknown) {
  if (value === undefined) return;
  const goals = expectArray(value, "goals", LIMITS.goals);
  for (const raw of goals) {
    const goal = expectObject(raw, "goal");
    expectOnlyKeys(goal, ["id", "kicker", "title"], "goal");
    expectId(goal.id, "goal id");
    expectString(goal.kicker, "goal category", 100);
    expectString(goal.title, "goal title", 300);
  }
}

function validateCalendarData(value: unknown, counters: { dayRecords: number; tasks: number }) {
  if (value === undefined) return;
  const stores = expectObject(value, "calendarData");
  const ids = Object.keys(stores);
  if (ids.length > LIMITS.calendars) throw invalid("too many calendar stores");
  for (const id of ids) {
    expectId(id, "calendar store id");
    const store = expectObject(stores[id], `calendarData.${id}`);
    expectOnlyKeys(store, ["dayPlans", "entries", "updatedAt"], "calendar store");
    validateDayPlans(store.dayPlans, `calendarData.${id}.dayPlans`, counters);
    validateEntries(store.entries, `calendarData.${id}.entries`, counters);
    optionalTimestamp(store.updatedAt, "calendar store updatedAt");
  }
}

function validateDayPlans(value: unknown, field: string, counters: { dayRecords: number; tasks: number }) {
  if (value === undefined) return;
  const plans = expectObject(value, field);
  for (const [key, raw] of Object.entries(plans)) {
    validateDateKey(key, "day plan key");
    counters.dayRecords += 1;
    const plan = expectObject(raw, `${field}.${key}`);
    expectOnlyKeys(plan, ["focus", "tasks", "updatedAt"], "day plan");
    optionalString(plan.focus, "day focus", LIMITS.focus);
    const tasks = expectArray(plan.tasks, "day tasks", LIMITS.tasksPerDay);
    counters.tasks += tasks.length;
    for (const taskValue of tasks) validateTask(taskValue);
    optionalTimestamp(plan.updatedAt, "day plan updatedAt");
  }
}

function validateEntries(value: unknown, field: string, counters: { dayRecords: number; tasks: number }) {
  if (value === undefined) return;
  const entries = expectObject(value, field);
  for (const [key, raw] of Object.entries(entries)) {
    validateDateKey(key, "entry key");
    counters.dayRecords += 1;
    validateEntry(raw, `${field}.${key}`);
  }
}

function validateTask(value: unknown) {
  const task = expectObject(value, "task");
  expectOnlyKeys(task, ["id", "title", "meta", "type"], "task");
  expectId(task.id, "task id");
  expectString(task.title, "task title", LIMITS.taskTitle);
  optionalString(task.meta, "task description", LIMITS.taskMeta);
  expectId(task.type, "task type");
}

function validateEntry(value: unknown, field: string) {
  const entry = expectObject(value, field);
  expectOnlyKeys(entry, ["tasks", "energy", "notes", "updatedAt"], "day entry");
  const tasks = expectObject(entry.tasks, "day task marks");
  if (Object.keys(tasks).length > LIMITS.tasksPerDay) throw invalid("too many task marks in one day");
  for (const [taskId, completed] of Object.entries(tasks)) {
    expectString(taskId, "task mark id", 256);
    if (typeof completed !== "boolean") throw invalid("task mark must be boolean");
  }
  expectInteger(entry.energy, "energy", 0, 10);
  optionalString(entry.notes, "notes", LIMITS.notes);
  optionalTimestamp(entry.updatedAt, "entry updatedAt");
}

function validateContentStudio(value: unknown) {
  if (value === undefined) return;
  const studio = expectObject(value, "contentStudio");
  expectOnlyKeys(studio, ["name", "items", "templates", "platforms", "pillars", "updatedAt"], "content studio");
  expectString(studio.name, "content studio name", 80);
  validateStringTokens(studio.platforms, "content platforms");
  validateStringTokens(studio.pillars, "content pillars");
  optionalTimestamp(studio.updatedAt, "content studio updatedAt");

  const items = expectArray(studio.items, "content items", LIMITS.contentItems);
  for (const raw of items) {
    const item = expectObject(raw, "content item");
    expectOnlyKeys(item, ["id", "title", "stage", "platform", "format", "pillar", "hook", "script", "nextAction", "publishDate", "publishTime", "metrics", "createdAt", "updatedAt"], "content item");
    expectId(item.id, "content item id");
    expectString(item.title, "content title", 160);
    expectString(item.stage, "content stage", 64);
    expectString(item.platform, "content platform", 80);
    expectString(item.format, "content format", 80);
    expectString(item.pillar, "content pillar", 80);
    optionalString(item.hook, "content hook", LIMITS.contentText);
    optionalString(item.script, "content script", LIMITS.contentText);
    optionalString(item.nextAction, "content next action", 300);
    optionalDate(item.publishDate, "content publish date");
    optionalTime(item.publishTime, "content publish time");
    validateMetrics(item.metrics);
    optionalTimestamp(item.createdAt, "content createdAt");
    optionalTimestamp(item.updatedAt, "content updatedAt");
  }

  const templates = expectArray(studio.templates, "content templates", LIMITS.contentTemplates);
  for (const raw of templates) {
    const item = expectObject(raw, "content template");
    expectOnlyKeys(item, ["id", "title", "format", "hook", "body", "system", "updatedAt"], "content template");
    expectId(item.id, "content template id");
    expectString(item.title, "content template title", 160);
    expectString(item.format, "content template format", 80);
    optionalString(item.hook, "content template hook", LIMITS.contentText);
    optionalString(item.body, "content template body", LIMITS.contentText);
    optionalBoolean(item.system, "content template system flag");
    optionalTimestamp(item.updatedAt, "content template updatedAt");
  }
}

function validateMetrics(value: unknown) {
  const metrics = expectObject(value, "content metrics");
  const keys = ["views", "reach", "likes", "comments", "shares", "saves", "retention"];
  expectOnlyKeys(metrics, keys, "content metrics");
  for (const key of keys) {
    const max = key === "retention" ? 100 : Number.MAX_SAFE_INTEGER;
    expectFiniteNumber(metrics[key], `content metric ${key}`, 0, max);
  }
}

function validateStringTokens(value: unknown, field: string) {
  const values = expectArray(value, field, 50);
  for (const token of values) expectString(token, field, 80);
}

function validateJsonComplexity(root: unknown) {
  let nodes = 0;
  const visit = (value: unknown, depth: number) => {
    nodes += 1;
    if (nodes > LIMITS.jsonNodes) throw invalid("payload contains too many values");
    if (depth > LIMITS.jsonDepth) throw invalid("payload is nested too deeply");
    if (Array.isArray(value)) value.forEach((entry) => visit(entry, depth + 1));
    else if (isPlainObject(value)) Object.values(value).forEach((entry) => visit(entry, depth + 1));
  };
  visit(root, 0);
}

function expectOnlyKeys(value: Record<string, unknown>, allowed: string[], field: string) {
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(value).find((key) => !allowedSet.has(key));
  if (unknown) throw invalid(`${field} contains an unsupported field: ${unknown}`);
}

function expectObject(value: unknown, field: string): Record<string, unknown> {
  if (!isPlainObject(value)) throw invalid(`${field} must be an object`);
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function expectArray(value: unknown, field: string, max: number) {
  if (!Array.isArray(value)) throw invalid(`${field} must be an array`);
  if (value.length > max) throw invalid(`${field} contains too many items`);
  return value;
}

function expectString(value: unknown, field: string, max: number) {
  if (typeof value !== "string" || value.length < 1 || value.length > max) {
    throw invalid(`${field} must be a non-empty string of at most ${max} characters`);
  }
  return value;
}

function optionalString(value: unknown, field: string, max: number) {
  if (value === undefined || value === null || value === "") return;
  if (typeof value !== "string" || value.length > max) throw invalid(`${field} is too long`);
}

function expectId(value: unknown, field: string) {
  const id = expectString(value, field, 128);
  if (!ID.test(id)) throw invalid(`${field} has invalid characters`);
  return id;
}

function expectColor(value: unknown, field: string) {
  const color = expectString(value, field, 7);
  if (!HEX_COLOR.test(color)) throw invalid(`${field} must be a hex color`);
}

function expectInteger(value: unknown, field: string, min: number, max: number) {
  if (!Number.isSafeInteger(value) || Number(value) < min || Number(value) > max) {
    throw invalid(`${field} must be an integer between ${min} and ${max}`);
  }
  return Number(value);
}

function expectFiniteNumber(value: unknown, field: string, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw invalid(`${field} must be a number between ${min} and ${max}`);
  }
  return value;
}

function optionalInteger(value: unknown, field: string, min: number, max: number) {
  if (value === undefined || value === null) return;
  expectInteger(value, field, min, max);
}

function optionalBoolean(value: unknown, field: string) {
  if (value !== undefined && typeof value !== "boolean") throw invalid(`${field} must be boolean`);
}

function optionalEnum(value: unknown, field: string, allowed: string[]) {
  if (value === undefined) return;
  if (typeof value !== "string" || !allowed.includes(value)) throw invalid(`${field} is invalid`);
}

function optionalTime(value: unknown, field: string) {
  if (value === undefined || value === "") return;
  validateTime(value, field);
}

function optionalDate(value: unknown, field: string) {
  if (value === undefined || value === "") return;
  validateDateKey(expectString(value, field, 10), field);
}

function optionalTimestamp(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") return;
  const text = expectString(value, field, 64);
  if (!ISO_DATE_TIME.test(text) || !Number.isFinite(Date.parse(text))) throw invalid(`${field} is not a valid timestamp`);
}

function optionalProfilePhoto(value: unknown) {
  if (value === undefined || value === null || value === "") return;
  const photo = expectString(value, "profilePhoto", LIMITS.profilePhoto);
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(photo)) {
    throw invalid("profilePhoto must be a JPEG, PNG, or WebP data URL");
  }
}

function validateDateKey(value: string, field: string) {
  if (!DATE_KEY.test(value)) throw invalid(`${field} is invalid`);
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw invalid(`${field} is not a real date`);
  }
  return value;
}

function expectBase64Url(value: unknown, field: string, min: number, max: number) {
  const text = expectString(value, field, max);
  if (text.length < min || !/^[A-Za-z0-9_-]+={0,2}$/.test(text)) throw invalid(`${field} is invalid`);
  return text;
}

function invalid(message: string) {
  return new HttpError(400, "VALIDATION_ERROR", message);
}
