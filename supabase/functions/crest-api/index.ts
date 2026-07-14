import { createClient } from "npm:@supabase/supabase-js@2.110.3";
import webpush from "npm:web-push@3.6.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const appUrl = "https://arman22a.github.io/Crest/index.html";

Deno.serve(async (request) => {
  const corsHeaders = cors(request);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, corsHeaders);

  try {
    const body = await request.json();
    const action = String(body.action || "");

    if (action === "dispatch") {
      await verifyCronSecret(request.headers.get("x-cron-secret") || "");
      return json(await dispatchReminders(), 200, corsHeaders);
    }

    const code = String(body.code || "").trim();
    if (code.length < 8) return json({ error: "Cloud password is too short", code: "INVALID_CODE" }, 400, corsHeaders);
    const syncId = await sha256(code);

    if (action === "pull") return await pullProgress(syncId, corsHeaders);
    if (action === "push") return await pushProgress(syncId, body, corsHeaders);
    if (action === "subscribe") return await subscribe(syncId, body, corsHeaders);
    if (action === "unsubscribe") return await unsubscribe(syncId, body, corsHeaders);
    if (action === "test_notification") return await testNotification(syncId, body, corsHeaders);
    return json({ error: "Unknown action", code: "UNKNOWN_ACTION" }, 400, corsHeaders);
  } catch (error) {
    console.error(error);
    return json({ error: "Crest cloud request failed", code: "SERVER_ERROR" }, 500, corsHeaders);
  }
});

async function pullProgress(syncId: string, headers: HeadersInit) {
  const row = await progressRow(syncId);
  if (!row) return json({ error: "Progress not found", code: "NOT_FOUND" }, 404, headers);
  return json({ payload: row.payload, revision: row.revision, updatedAt: row.updated_at }, 200, headers);
}

async function pushProgress(syncId: string, body: Record<string, unknown>, headers: HeadersInit) {
  const incoming = isObject(body.payload) ? body.payload : {};
  const baseRevision = Number(body.baseRevision) || 0;
  const current = await progressRow(syncId);
  const payload = current
    ? mergeProgress(current.payload || {}, incoming, baseRevision === Number(current.revision))
    : incoming;
  const revision = current ? Number(current.revision) + 1 : 1;
  const updatedAt = new Date().toISOString();

  let error;
  if (current) {
    ({ error } = await supabase
      .from("progress_sync")
      .update({ payload, revision, updated_at: updatedAt })
      .eq("sync_id", syncId));
  } else {
    ({ error } = await supabase.from("progress_sync").insert({
      sync_id: syncId,
      payload,
      revision,
      updated_at: updatedAt
    }));
  }
  if (error) throw error;

  if (isObject(body.reminderDays)) {
    const { error: reminderError } = await supabase
      .from("push_subscriptions")
      .update({ reminder_days: body.reminderDays, updated_at: updatedAt })
      .eq("sync_id", syncId);
    if (reminderError) throw reminderError;
  }

  return json({ payload, revision, updatedAt }, 200, headers);
}

async function subscribe(syncId: string, body: Record<string, unknown>, headers: HeadersInit) {
  if (!await progressRow(syncId)) return json({ error: "Connect cloud first", code: "NOT_FOUND" }, 404, headers);
  const subscription = isObject(body.subscription) ? body.subscription : null;
  const endpoint = subscription && typeof subscription.endpoint === "string" ? subscription.endpoint : "";
  if (!endpoint) return json({ error: "Invalid subscription", code: "INVALID_SUBSCRIPTION" }, 400, headers);

  const row = {
    sync_id: syncId,
    endpoint,
    subscription,
    device_name: safeText(body.deviceName, "Crest", 40),
    timezone: safeText(body.timezone, "Europe/Moscow", 80),
    morning_time: safeTime(body.morningTime, "10:00"),
    evening_time: safeTime(body.eveningTime, "16:00"),
    reminder_days: isObject(body.reminderDays) ? body.reminderDays : {},
    enabled: true,
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from("push_subscriptions").upsert(row, { onConflict: "endpoint" });
  if (error) throw error;
  return json({ ok: true }, 200, headers);
}

async function unsubscribe(syncId: string, body: Record<string, unknown>, headers: HeadersInit) {
  const endpoint = String(body.endpoint || "");
  if (endpoint) {
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("sync_id", syncId)
      .eq("endpoint", endpoint);
    if (error) throw error;
  }
  return json({ ok: true }, 200, headers);
}

async function testNotification(syncId: string, body: Record<string, unknown>, headers: HeadersInit) {
  const endpoint = String(body.endpoint || "");
  const query = supabase.from("push_subscriptions").select("*").eq("sync_id", syncId).eq("enabled", true);
  const { data, error } = endpoint ? await query.eq("endpoint", endpoint).maybeSingle() : await query.limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return json({ error: "Subscription not found", code: "NOT_FOUND" }, 404, headers);
  await sendPush(data.subscription, {
    title: "Crest работает",
    body: "Тестовое уведомление доставлено. Напоминания готовы.",
    tag: "crest-test",
    incompleteCount: 0,
    url: appUrl
  });
  return json({ ok: true }, 200, headers);
}

async function dispatchReminders() {
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("enabled", true);
  if (error) throw error;

  let sent = 0;
  let removed = 0;
  for (const subscription of subscriptions || []) {
    const local = localClock(new Date(), subscription.timezone);
    const morningDue = dueNow(local.time, subscription.morning_time) && subscription.last_morning_sent_on !== local.date;
    const eveningDue = dueNow(local.time, subscription.evening_time) && subscription.last_evening_sent_on !== local.date;
    if (!morningDue && !eveningDue) continue;

    const slot = morningDue ? "morning" : "evening";
    const day = subscription.reminder_days?.[local.date];
    const incomplete = Array.isArray(day?.incomplete) ? day.incomplete : [];
    const sentColumn = slot === "morning" ? "last_morning_sent_on" : "last_evening_sent_on";

    if (incomplete.length > 0) {
      const names = incomplete.slice(0, 3).map((task: Record<string, unknown>) => String(task.title || "задача"));
      const extra = incomplete.length > 3 ? ` и ещё ${incomplete.length - 3}` : "";
      const payload = {
        title: slot === "morning" ? "План на сегодня" : "Задачи ещё ждут",
        body: slot === "morning"
          ? `${incomplete.length} незавершённых: ${names.join(", ")}${extra}.`
          : `Осталось ${incomplete.length}: ${names.join(", ")}${extra}.`,
        tag: `crest-${slot}-${local.date}`,
        incompleteCount: incomplete.length,
        url: `${appUrl}?date=${local.date}`
      };
      try {
        await sendPush(subscription.subscription, payload);
        sent += 1;
      } catch (pushError) {
        const status = Number((pushError as { statusCode?: number }).statusCode) || 0;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
          removed += 1;
          continue;
        }
        console.error("Push failed", status, pushError);
        continue;
      }
    }

    await supabase
      .from("push_subscriptions")
      .update({ [sentColumn]: local.date, updated_at: new Date().toISOString() })
      .eq("id", subscription.id);
  }
  return { ok: true, sent, removed };
}

async function sendPush(subscription: Record<string, unknown>, payload: Record<string, unknown>) {
  const secrets = await serverSecrets(["vapid_public_key", "vapid_private_key"]);
  webpush.setVapidDetails("mailto:arman22a@users.noreply.github.com", secrets.vapid_public_key, secrets.vapid_private_key);
  return await webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 300 });
}

async function verifyCronSecret(secret: string) {
  if (!secret) throw new Error("Missing scheduler secret");
  const secrets = await serverSecrets(["cron_secret_hash"]);
  if (await sha256(secret) !== secrets.cron_secret_hash) throw new Error("Invalid scheduler secret");
}

async function serverSecrets(names: string[]) {
  const { data, error } = await supabase.from("crest_server_secrets").select("name,value").in("name", names);
  if (error) throw error;
  const result = Object.fromEntries((data || []).map((item) => [item.name, item.value]));
  if (names.some((name) => !result[name])) throw new Error("Server secret is missing");
  return result;
}

async function progressRow(syncId: string) {
  const { data, error } = await supabase
    .from("progress_sync")
    .select("payload,revision,updated_at")
    .eq("sync_id", syncId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function mergeProgress(server: Record<string, unknown>, incoming: Record<string, unknown>, revisionsMatch: boolean) {
  const merged: Record<string, unknown> = revisionsMatch ? { ...incoming } : { ...server, ...incoming };
  const serverLocked = isObject(server.lockedDays) ? server.lockedDays : {};
  const incomingLocked = isObject(incoming.lockedDays) ? incoming.lockedDays : {};
  merged.lockedDays = { ...incomingLocked, ...serverLocked };
  merged.dayPlans = mergeUpdatedMap(server.dayPlans, incoming.dayPlans, revisionsMatch);

  const dateKeys = new Set([...Object.keys(server), ...Object.keys(incoming)].filter(isDateKey));
  for (const key of dateKeys) {
    if (serverLocked[key]) {
      merged[key] = server[key];
    } else {
      merged[key] = revisionsMatch ? incoming[key] : newer(server[key], incoming[key]);
    }
  }

  for (const key of Object.keys(serverLocked)) {
    if (isObject(server.dayPlans) && server.dayPlans[key]) {
      (merged.dayPlans as Record<string, unknown>)[key] = server.dayPlans[key];
    }
  }

  chooseSection(merged, server, incoming, "goals", "goalsUpdatedAt", revisionsMatch);
  chooseSection(merged, server, incoming, "profilePhoto", "profileUpdatedAt", revisionsMatch);
  chooseSection(merged, server, incoming, "profilePhotoVersion", "profileUpdatedAt", revisionsMatch);
  chooseSection(merged, server, incoming, "theme", "themeUpdatedAt", revisionsMatch);
  for (const field of ["reminderMorning", "reminderEvening", "reminderTimezone"]) {
    chooseSection(merged, server, incoming, field, "reminderUpdatedAt", revisionsMatch);
  }
  return merged;
}

function mergeUpdatedMap(serverValue: unknown, incomingValue: unknown, revisionsMatch: boolean) {
  const server = isObject(serverValue) ? serverValue : {};
  const incoming = isObject(incomingValue) ? incomingValue : {};
  if (revisionsMatch) return { ...incoming };
  const result: Record<string, unknown> = {};
  for (const key of new Set([...Object.keys(server), ...Object.keys(incoming)])) {
    result[key] = newer(server[key], incoming[key]);
  }
  return result;
}

function newer(left: unknown, right: unknown) {
  if (right === undefined) return left;
  if (left === undefined) return right;
  const leftTime = Date.parse(isObject(left) ? String(left.updatedAt || "") : "") || 0;
  const rightTime = Date.parse(isObject(right) ? String(right.updatedAt || "") : "") || 0;
  return rightTime >= leftTime ? right : left;
}

function chooseSection(
  target: Record<string, unknown>,
  server: Record<string, unknown>,
  incoming: Record<string, unknown>,
  field: string,
  timestampField: string,
  revisionsMatch: boolean
) {
  if (revisionsMatch) {
    target[field] = incoming[field];
    target[timestampField] = incoming[timestampField];
    return;
  }
  const serverTime = Date.parse(String(server[timestampField] || "")) || 0;
  const incomingTime = Date.parse(String(incoming[timestampField] || "")) || 0;
  if (incomingTime >= serverTime) {
    target[field] = incoming[field];
    target[timestampField] = incoming[timestampField];
  } else {
    target[field] = server[field];
    target[timestampField] = server[timestampField];
  }
}

function localClock(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` };
}

function dueNow(current: string, target: string) {
  const currentMinutes = toMinutes(current);
  const targetMinutes = toMinutes(String(target || "").slice(0, 5));
  return currentMinutes >= targetMinutes && currentMinutes < targetMinutes + 2;
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeTime(value: unknown, fallback: string) {
  const text = String(value || "");
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : fallback;
}

function safeText(value: unknown, fallback: string, max: number) {
  const text = String(value || "").trim();
  return (text || fallback).slice(0, max);
}

function isDateKey(key: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(key);
}

function isObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cors(request: Request) {
  const origin = request.headers.get("origin") || "";
  const allowed = origin === "https://arman22a.github.io" || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "https://arman22a.github.io",
    "Access-Control-Allow-Headers": "apikey, content-type, x-cron-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

function json(body: Record<string, unknown>, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}
