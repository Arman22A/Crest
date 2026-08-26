import { HttpError } from "./validation.ts";

export async function serverSecrets(supabaseAdmin: any, names: string[]) {
  const { data, error } = await supabaseAdmin
    .from("crest_server_secrets")
    .select("name,value")
    .in("name", names);
  if (error) throw new HttpError(503, "SERVER_SECRETS_UNAVAILABLE", "Server configuration is unavailable");

  const values = Object.fromEntries((data || []).map((item: { name: string; value: string }) => [item.name, item.value]));
  if (names.some((name) => typeof values[name] !== "string" || values[name].length === 0)) {
    throw new HttpError(503, "SERVER_SECRETS_MISSING", "Server configuration is incomplete");
  }
  return values as Record<string, string>;
}

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function constantTimeEqual(left: string, right: string) {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
  }
  return difference === 0;
}
