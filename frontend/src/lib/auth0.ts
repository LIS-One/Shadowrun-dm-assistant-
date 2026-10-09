import { Auth0Client } from "@auth0/nextjs-auth0/server";

let client: Auth0Client | null = null;

/**
 * Lazily created so the app can boot in dev-auth mode without any Auth0 settings.
 * Reads AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET and APP_BASE_URL.
 */
export function getAuth0(): Auth0Client {
  if (!client) {
    client = new Auth0Client({
      authorizationParameters: {
        // Without an audience Auth0 issues an opaque token the Spring API can't validate.
        audience: process.env.AUTH0_AUDIENCE,
        scope: "openid profile email offline_access",
        // Show Auth0's login/sign-up pages in Russian (when Russian is enabled in the tenant).
        ui_locales: "ru",
      },
      signInReturnToPath: "/campaigns",
    });
  }
  return client;
}
