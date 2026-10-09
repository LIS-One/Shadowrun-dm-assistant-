import { cookies } from "next/headers";
import { getAuth0 } from "./auth0";
import { DEV_COOKIE, isDevAuth, verifyDevToken } from "./dev-auth";

export interface CurrentUser {
  sub: string;
  name: string;
  email?: string;
  picture?: string;
}

/** The signed-in user for server components and route handlers, or null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (isDevAuth()) {
    const token = (await cookies()).get(DEV_COOKIE)?.value;
    return token ? await verifyDevToken(token) : null;
  }
  const session = await getAuth0().getSession();
  if (!session) return null;
  const { sub, name, nickname, email, picture } = session.user;
  // Email/password sign-ups get their email as "name"; show the nickname instead so other
  // players in the campaign don't see each other's email addresses.
  const display = name && !name.includes("@") ? name : (nickname ?? name ?? email ?? sub);
  return { sub, name: display, email, picture };
}

/** The bearer token to forward to the Spring API, or null when not signed in. */
export async function getBackendToken(): Promise<string | null> {
  if (isDevAuth()) {
    const token = (await cookies()).get(DEV_COOKIE)?.value;
    return token && (await verifyDevToken(token)) ? token : null;
  }
  try {
    const { token } = await getAuth0().getAccessToken();
    return token;
  } catch {
    return null;
  }
}

/** Login entry point; `signup` opens Auth0's registration screen first (invited players are usually new). */
export function loginUrl(returnTo = "/campaigns", { signup = false } = {}): string {
  if (isDevAuth()) return `/dev-login?returnTo=${encodeURIComponent(returnTo)}`;
  return `/auth/login?returnTo=${encodeURIComponent(returnTo)}${signup ? "&screen_hint=signup" : ""}`;
}

export function logoutUrl(): string {
  return isDevAuth() ? "/dev-login/logout" : "/auth/logout";
}
