import { createSupabaseContext } from "npm:@supabase/server@1.4.1";
import webpush from "npm:web-push@3.6.7";
import { jsonResponse, methodNotAllowed, publicError } from "../_shared/http.ts";
import {
  HttpError,
  readJsonRequest,
  validateCronAction,
  validatePushSubscription,
  validateTimezone
} from "../_shared/validation.ts";
import { dueNow, localClock, reminderPayload } from "../_shared/reminders.ts";

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") return methodNotAllowed({});
    try {
      verifyCronSecret(request.headers.get("x-cron-secret") || "");
      validateCronAction(await readJsonRequest(request, 4_096));
      const { data: context, error } = await createSupabaseContext(request, { auth: "none" });
      if (error || !context?.supabaseAdmin) {
        throw new HttpError(503, "SERVICE_NOT_CONFIGURED", "Reminder service is not configured");
      }
      return jsonResponse(await dispatchReminders(context.supabaseAdmin));
    } catch (error) {
      logSafeFailure(error);
      return publicError(error, {});
    }
  }
};

async function dispatchReminders(supabase: any) {
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id,subscription,timezone,morning_time,evening_time,reminder_days,last_morning_sent_on,last_evening_sent_on,privacy_mode")
    .eq("enabled", true);
  if (error) throw new HttpError(500, "DATABASE_ERROR", "Reminder storage is unavailable");

  const summary = { ok: true, checked: 0, sent: 0, removed: 0, skipped: 0, failed: 0 };
  for (const subscription of subscriptions || []) {
    summary.checked += 1;
    try {
      const timezone = validateTimezone(subscription.timezone);
      const local = localClock(new Date(), timezone);
      const morningDue = dueNow(local.time, String(subscription.morning_time || "").slice(0, 5))
        && subscription.last_morning_sent_on !== local.date;
      const eveningDue = dueNow(local.time, String(subscription.evening_time || "").slice(0, 5))
        && subscription.last_evening_sent_on !== local.date;
      if (!morningDue && !eveningDue) continue;

      const slot = morningDue ? "morning" : "evening";
      const sentColumn = slot === "morning" ? "last_morning_sent_on" : "last_evening_sent_on";
      const previousSentOn = subscription[sentColumn] || null;
      const day = plainObject(subscription.reminder_days?.[local.date]);
      const incomplete = Array.isArray(day?.incomplete) ? day.incomplete.slice(0, 100) : [];
      if (incomplete.length === 0) continue;

      const pushSubscription = validatePushSubscription(subscription.subscription);
      const payload = reminderPayload(slot, local.date, incomplete, subscription.privacy_mode, appUrl());
      const claimed = await claimReminderSlot(supabase, subscription.id, sentColumn, local.date);
      if (!claimed) continue;
      try {
        await sendPush(pushSubscription, payload);
        summary.sent += 1;
      } catch (pushError) {
        const status = Number((pushError as { statusCode?: number })?.statusCode) || 0;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
          summary.removed += 1;
        } else {
          await releaseReminderSlot(supabase, subscription.id, sentColumn, local.date, previousSentOn);
          summary.failed += 1;
        }
      }
    } catch {
      summary.skipped += 1;
    }
  }
  return summary;
}

async function claimReminderSlot(supabase: any, id: string, column: string, date: string) {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .update({ [column]: date, updated_at: new Date().toISOString() })
    .eq("id", id)
    .or(`${column}.is.null,${column}.neq.${date}`)
    .select("id")
    .maybeSingle();
  if (error) throw new Error("slot claim failed");
  return Boolean(data);
}

async function releaseReminderSlot(
  supabase: any,
  id: string,
  column: string,
  claimedDate: string,
  previousSentOn: string | null
) {
  await supabase
    .from("push_subscriptions")
    .update({ [column]: previousSentOn, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq(column, claimedDate);
}

async function sendPush(subscription: Record<string, unknown>, payload: Record<string, unknown>) {
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  const subject = Deno.env.get("VAPID_SUBJECT") || "";
  if (!publicKey || !privateKey || !subject) throw new Error("push configuration missing");
  webpush.setVapidDetails(subject, publicKey, privateKey);
  await webpush.sendNotification(subscription as any, JSON.stringify(payload), { TTL: 300 });
}

function verifyCronSecret(candidate: string) {
  const expected = Deno.env.get("CREST_CRON_SECRET") || "";
  if (!expected || !candidate || !constantTimeEqual(candidate, expected)) {
    throw new HttpError(401, "CRON_AUTH_REQUIRED", "Scheduler authentication failed");
  }
}

function constantTimeEqual(left: string, right: string) {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
  }
  return difference === 0;
}

function plainObject(value: unknown): Record<string, any> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : null;
}

function appUrl() {
  return Deno.env.get("CREST_APP_URL") || "https://arman22a.github.io/Crest/index.html";
}

function logSafeFailure(error: unknown) {
  const code = error instanceof HttpError ? error.code : "UNEXPECTED_ERROR";
  console.error("crest-cron-dispatch request failed", { code });
}
