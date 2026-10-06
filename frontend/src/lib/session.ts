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
  return { sub, name: name ?? nickname ?? email ?? sub, email, picture };
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

export function loginUrl(returnTo = "/campaigns"): string {
  const base = isDevAuth() ? "/dev-login" : "/auth/login";
  return `${base}?returnTo=${encodeURIComponent(returnTo)}`;
}

export function logoutUrl(): string {
  return isDevAuth() ? "/dev-login/logout" : "/auth/logout";
}
