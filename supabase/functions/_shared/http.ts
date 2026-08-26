import { HttpError } from "./validation.ts";

const LOCAL_ORIGIN = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/;
const PRODUCTION_ORIGIN = "https://arman22a.github.io";

export function corsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "";
  const allowed = origin === PRODUCTION_ORIGIN || LOCAL_ORIGIN.test(origin);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "apikey, authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin"
  };
  if (allowed) headers["Access-Control-Allow-Origin"] = origin;
  return { headers, allowed: allowed || !origin };
}

export function preflight(request: Request) {
  const cors = corsHeaders(request);
  if (!cors.allowed) return jsonResponse({ error: "Origin is not allowed", code: "ORIGIN_DENIED" }, 403, cors.headers);
  return new Response(null, { status: 204, headers: cors.headers });
}

export function jsonResponse(body: Record<string, unknown>, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export function publicError(error: unknown, headers: HeadersInit) {
  if (error instanceof HttpError) {
    return jsonResponse({ error: error.message, code: error.code }, error.status, headers);
  }
  return jsonResponse({ error: "Crest cloud request failed", code: "SERVER_ERROR" }, 500, headers);
}

export function methodNotAllowed(headers: HeadersInit) {
  return jsonResponse({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405, headers);
}
