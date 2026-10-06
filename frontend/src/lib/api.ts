/** Browser-side client for the Spring API, reached through the /api/backend proxy route. */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

export const API_BASE = "/api/backend";

/** Turns a backend path such as "/api/campaigns/1/maps/2/image" into a same-origin URL. */
export function backendUrl(apiPath: string): string {
  return API_BASE + apiPath.replace(/^\/api/, "");
}

export async function api<T = void>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const response = await fetch(API_BASE + path, {
    ...rest,
    headers: json !== undefined ? { "content-type": "application/json", ...headers } : headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (response.status === 401 && typeof window !== "undefined") {
    // A full navigation is intended: /login is a route handler that redirects to Auth0.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
  }
  if (!response.ok) {
    let message = `Ошибка ${response.status}`;
    let fieldErrors: Record<string, string> = {};
    try {
      const problem = await response.json();
      message = problem.detail ?? problem.title ?? message;
      fieldErrors = problem.errors ?? {};
    } catch {
      // not a problem+json body
    }
    throw new ApiError(response.status, message, fieldErrors);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const fetcher = <T,>(path: string) => api<T>(path);

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const fields = Object.entries(error.fieldErrors);
    return fields.length ? `${error.message}: ${fields.map(([k, v]) => `${k} — ${v}`).join(", ")}` : error.message;
  }
  return error instanceof Error ? error.message : String(error);
}
