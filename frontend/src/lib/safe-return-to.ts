/** Only allow same-site relative paths to avoid open redirects. */
export function safeReturnTo(value: unknown, fallback = "/campaigns"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
