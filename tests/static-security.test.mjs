import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = new URL("..", import.meta.url).pathname.replace(/^\/(.:)/, "$1");
const read = (path) => readFileSync(join(root, path), "utf8");

test("client and Edge sources contain no private key material", () => {
  const files = [
    "index.html", "script.js", "sw.js",
    "supabase/functions/crest-api/index.ts",
    "supabase/functions/crest-user-api/index.ts",
    "supabase/functions/crest-cron-dispatch/index.ts",
    "supabase/functions/_shared/server-secrets.ts"
  ];
  const source = files.map(read).join("\n");
  assert.doesNotMatch(source, /sb_secret_[A-Za-z0-9_-]{12,}/);
  assert.doesNotMatch(source, /BEGIN (RSA |EC )?PRIVATE KEY/);
  assert.doesNotMatch(source, /OPENAI_API_KEY/);
});

test("function authentication modes stay split", () => {
  const config = read("supabase/config.toml");
  assert.match(config, /\[functions\.crest-user-api\][\s\S]*?verify_jwt = true/);
  assert.match(config, /\[functions\.crest-cron-dispatch\][\s\S]*?verify_jwt = false/);
  assert.match(read("supabase/functions/crest-user-api/index.ts"), /auth: "user"/);
  assert.match(read("supabase/functions/crest-cron-dispatch/index.ts"), /cron_secret_hash/);
  assert.match(read("supabase/functions/crest-user-api/index.ts"), /await requireOwner\(context\.supabase\)/);
  assert.match(read("supabase/functions/crest-api/index.ts"), /Deno\.serve/);
  assert.doesNotMatch(read("supabase/functions/_shared/http.ts"), /x-cron-secret/i);
});

test("reminder cron migration preserves the protected server secret", () => {
  const migration = read("supabase/migrations/20260827000000_switch_reminder_cron_dispatch.sql");
  assert.match(migration, /cron\.alter_job/);
  assert.match(migration, /replace\(reminder_job\.command, '\/crest-api', '\/crest-cron-dispatch'\)/);
  assert.doesNotMatch(migration, /x-cron-secret/i);
  assert.doesNotMatch(migration, /vault\.decrypted_secrets/i);
});

test("secure API rollout uses the protected endpoint and keeps the rollback URL", () => {
  const client = read("script.js");
  assert.match(client, /const secureCloudRollout = true;/);
  assert.match(client, /const legacyCloudFunctionUrl = .*\/crest-api";/);
  assert.match(client, /const secureCloudFunctionUrl = .*\/crest-user-api";/);
});

test("the planner stays hidden and inert until authentication succeeds", () => {
  const html = read("index.html");
  const css = read("styles.css");
  const script = read("script.js");
  assert.match(html, /<div class="app-root" id="appRoot" aria-hidden="true" inert>/);
  assert.match(css, /body:not\(\.is-authenticated\) \.app-root/);
  assert.match(script, /appRoot\.inert = !authenticated/);
  assert.match(script, /setAuthenticatedUi\(false\)/);
});

test("PWA keeps an id and repairs changed push subscriptions through the page", () => {
  const manifest = JSON.parse(read("manifest.webmanifest"));
  assert.equal(manifest.id, "./");
  const worker = read("sw.js");
  const client = read("script.js");
  assert.match(worker, /pushsubscriptionchange/);
  assert.match(worker, /CREST_PUSH_SUBSCRIPTION_CHANGED/);
  assert.match(client, /CREST_PUSH_SUBSCRIPTION_CHANGED/);
  assert.match(client, /refreshNotificationSubscription/);
});

test("device-data deletion is gated by cloud save and notification revocation", () => {
  const client = read("script.js");
  const secureLogout = client.slice(client.indexOf("async function logoutAndDeleteDeviceData"), client.indexOf("async function revokeDeviceNotification"));
  assert.ok(secureLogout.indexOf("await pushCloudState") < secureLogout.indexOf("localStorage.removeItem(`crest-user-${userId}`)"));
  assert.ok(secureLogout.indexOf("await revokeDeviceNotification") < secureLogout.indexOf("localStorage.removeItem(`crest-user-${userId}`)"));
  assert.match(secureLogout, /localStorage\.getItem\(legacyClaimedStorageKey\) === userId/);
  const revocation = client.slice(client.indexOf("async function revokeDeviceNotification"), client.indexOf("async function saveProfileName"));
  assert.match(revocation, /let serverRevoked = true/);
  assert.match(revocation, /let browserRevoked = true/);
  assert.match(revocation, /serverRevoked && browserRevoked/);
});
