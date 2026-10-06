import type { NextRequest } from "next/server";
import { getBackendToken } from "@/lib/session";

/**
 * Backend-for-frontend proxy: the browser talks to /api/backend/* with its session cookie and
 * this handler forwards the call to the Spring API with the user's access token. Tokens never
 * reach browser JavaScript, and <img>/Leaflet can load protected map images by plain URL.
 */
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

const FORWARDED_REQUEST_HEADERS = ["content-type", "accept", "if-none-match"];
const FORWARDED_RESPONSE_HEADERS = ["content-type", "cache-control", "etag", "x-content-type-options", "content-length"];

const SAFE_METHODS = new Set(["GET", "HEAD"]);

/** Same-origin check; APP_BASE_URL covers deployments behind a proxy that rewrites the Host header. */
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const host = new URL(origin).host;
    const allowed = [request.headers.get("host"), process.env.APP_BASE_URL && new URL(process.env.APP_BASE_URL).host];
    return allowed.includes(host);
  } catch {
    return false;
  }
}

async function forward(request: NextRequest, ctx: RouteContext<"/api/backend/[...path]">) {
  // Defense in depth on top of SameSite cookies: state-changing calls must come from this origin.
  if (!SAFE_METHODS.has(request.method) && !isSameOrigin(request)) {
    return Response.json({ title: "Forbidden", status: 403, detail: "Cross-origin request rejected" }, { status: 403 });
  }

  const { path } = await ctx.params;
  if (path.some((segment) => segment === "." || segment === "..")) {
    return Response.json({ title: "Bad Request", status: 400, detail: "Invalid path" }, { status: 400 });
  }

  const token = await getBackendToken();
  if (!token) {
    return Response.json({ title: "Unauthorized", status: 401, detail: "Not signed in" }, { status: 401 });
  }

  const target = new URL(`/api/${path.map(encodeURIComponent).join("/")}`, BACKEND_URL);
  target.search = request.nextUrl.search;

  const headers = new Headers({ authorization: `Bearer ${token}` });
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const hasBody = !SAFE_METHODS.has(request.method);
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      // Required by Node's fetch to stream a request body (map uploads).
      ...(hasBody ? { duplex: "half" } : {}),
      cache: "no-store",
      redirect: "manual",
    } as RequestInit);
  } catch {
    return Response.json({ title: "Bad Gateway", status: 502, detail: "API is unavailable" }, { status: 502 });
  }

  const responseHeaders = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
