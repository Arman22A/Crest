import { createSupabaseContext } from "npm:@supabase/server@1.4.1";
import webpush from "npm:web-push@3.6.7";
import { corsHeaders, jsonResponse, methodNotAllowed, preflight, publicError } from "../_shared/http.ts";
import { serverSecrets } from "../_shared/server-secrets.ts";
import {
  HttpError,
  readJsonRequest,
  validateUserAction
} from "../_shared/validation.ts";

const RATE_LIMITED_ACTIONS = new Set(["pull", "push", "subscribe", "unsubscribe", "test_notification"]);

export default {
  async fetch(request: Request) {
    if (request.method === "OPTIONS") return preflight(request);
    const cors = corsHeaders(request);
    if (!cors.allowed) return jsonResponse({ error: "Origin is not allowed", code: "ORIGIN_DENIED" }, 403, cors.headers);
    if (request.method !== "POST") return methodNotAllowed(cors.headers);

    const { data: context, error: authError } = await createSupabaseContext(request, { auth: "user" });
    if (authError || !context?.userClaims?.id) {
      return jsonResponse({ error: "Sign in required", code: "AUTH_REQUIRED" }, 401, cors.headers);
    }

    try {
      await requireOwner(context.supabase);
      const body = await readJsonRequest(request);
      const input = validateUserAction(body);
      if (!RATE_LIMITED_ACTIONS.has(input.action)) throw new HttpError(400, "UNKNOWN_ACTION", "Unknown action");
      await consumeRateLimit(context.supabase, input.action);

      if (input.action === "pull") return await pullProgress(context.supabase, cors.headers);
      if (input.action === "push") return await pushProgress(context.supabase, input, cors.headers);
      if (input.action === "subscribe") return await subscribe(context.supabase, context.userClaims.id, input, cors.headers);
      if (input.action === "unsubscribe") return await unsubscribe(context.supabase, input.endpoint, cors.headers);
      return await testNotification(context.supabase, context.supabaseAdmin, input.endpoint, cors.headers);
    } catch (error) {
      logSafeFailure(error);
      return publicError(error, cors.headers);
    }
  }
};

async function pullProgress(supabase: any, headers: HeadersInit) {
  const { data, error } = await supabase
    .from("progress_sync")
    .select("payload,revision,updated_at")
    .maybeSingle();
  if (error) throw databaseError();
  if (!data) return jsonResponse({ exists: false, payload: {}, revision: 0, updatedAt: null }, 200, headers);
  return jsonResponse({
    exists: true,
    payload: data.payload,
    revision: Number(data.revision),
    updatedAt: data.updated_at
  }, 200, headers);
}

async function pushProgress(
  supabase: any,
  input: {
    baseRevision: number;
    payload: Record<string, unknown>;
    reminderDays?: Record<string, unknown>;
  },
  headers: HeadersInit
) {
  const { data, error } = await supabase
    .rpc("crest_push_progress", {
      p_base_revision: input.baseRevision,
      p_payload: input.payload
    })
    .single();
  if (error || !data) throw databaseError();

  if (data.result_status === "conflict") {
    return jsonResponse({
      error: "Progress changed on another device",
      code: "REVISION_CONFLICT",
      exists: Number(data.current_revision) > 0,
      payload: data.server_payload || {},
      revision: Number(data.current_revision) || 0,
      updatedAt: data.server_updated_at || null
    }, 409, headers);
  }

  let remindersUpdated = true;
  if (input.reminderDays) {
    const reminderUpdate = await supabase
      .from("push_subscriptions")
      .update({ reminder_days: input.reminderDays, updated_at: new Date().toISOString() });
    remindersUpdated = !reminderUpdate.error;
  }

  return jsonResponse({
    exists: true,
    payload: data.server_payload,
    revision: Number(data.current_revision),
    updatedAt: data.server_updated_at,
    remindersUpdated
  }, 200, headers);
}

async function subscribe(
  supabase: any,
  userId: string,
  input: {
    subscription: Record<string, unknown>;
    deviceName: string;
    timezone: string;
    morningTime: string;
    eveningTime: string;
    reminderDays: Record<string, unknown>;
    privacyMode: "neutral" | "detailed";
  },
  headers: HeadersInit
) {
  const syncId = `user:${userId}`;
  const progress = await supabase.from("progress_sync").select("sync_id").maybeSingle();
  if (progress.error) throw databaseError();
  if (!progress.data) throw new HttpError(404, "NOT_FOUND", "Sync account first");

  const row = {
    sync_id: syncId,
    user_id: userId,
    endpoint: String(input.subscription.endpoint),
    subscription: input.subscription,
    device_name: input.deviceName,
    timezone: input.timezone,
    morning_time: input.morningTime,
    evening_time: input.eveningTime,
    reminder_days: input.reminderDays,
    privacy_mode: input.privacyMode,
    enabled: true,
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from("push_subscriptions").upsert(row, { onConflict: "endpoint" });
  if (error) throw databaseError();
  return jsonResponse({ ok: true }, 200, headers);
}

async function unsubscribe(supabase: any, endpoint: string, headers: HeadersInit) {
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw databaseError();
  return jsonResponse({ ok: true }, 200, headers);
}

async function testNotification(supabase: any, supabaseAdmin: any, endpoint: string, headers: HeadersInit) {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("subscription")
    .eq("endpoint", endpoint)
    .eq("enabled", true)
    .maybeSingle();
  if (error) throw databaseError();
  if (!data) throw new HttpError(404, "NOT_FOUND", "Subscription not found");

  await sendPush(supabaseAdmin, data.subscription, {
    title: "Crest работает",
    body: "Тестовое уведомление доставлено. Напоминания готовы.",
    tag: "crest-test",
    incompleteCount: 0,
    url: appUrl()
  });
  return jsonResponse({ ok: true }, 200, headers);
}

async function consumeRateLimit(supabase: any, action: string) {
  const { data, error } = await supabase.rpc("crest_consume_rate_limit", { p_action: action });
  if (error) throw databaseError();
  if (data !== true) throw new HttpError(429, "RATE_LIMITED", "Too many requests");
}

async function requireOwner(supabase: any) {
  const { data, error } = await supabase.from("progress_sync").select("sync_id").maybeSingle();
  if (error) throw databaseError();
  if (!data) throw new HttpError(403, "OWNER_REQUIRED", "Crest owner access required");
}

async function sendPush(
  supabaseAdmin: any,
  subscription: Record<string, unknown>,
  payload: Record<string, unknown>
) {
  const secrets = await serverSecrets(supabaseAdmin, ["vapid_public_key", "vapid_private_key"]);
  const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:arman22a@users.noreply.github.com";
  webpush.setVapidDetails(subject, secrets.vapid_public_key, secrets.vapid_private_key);
  await webpush.sendNotification(subscription as any, JSON.stringify(payload), { TTL: 300 });
}

function appUrl() {
  return Deno.env.get("CREST_APP_URL") || "https://arman22a.github.io/Crest/index.html";
}

function databaseError() {
  return new HttpError(500, "DATABASE_ERROR", "Cloud storage is temporarily unavailable");
}

function logSafeFailure(error: unknown) {
  const code = error instanceof HttpError ? error.code : "UNEXPECTED_ERROR";
  console.error("crest-user-api request failed", { code });
}
