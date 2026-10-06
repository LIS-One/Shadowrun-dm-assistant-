import { jwtVerify, SignJWT } from "jose";

/**
 * Local development login that replaces Auth0. The frontend signs an HS256 token that the
 * Spring backend accepts when it runs with DEV_AUTH_ENABLED=true and the same secret.
 * Never enable this on a public deployment.
 */
export const DEV_COOKIE = "dm_dev_session";
export const DEV_ISSUER = "dm-assistant-dev";

export function isDevAuth(): boolean {
  return process.env.AUTH_MODE === "dev";
}

function secretKey(): Uint8Array {
  const secret = process.env.DEV_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("DEV_AUTH_SECRET must be at least 32 characters when AUTH_MODE=dev");
  }
  return new TextEncoder().encode(secret);
}

export interface DevIdentity {
  sub: string;
  name: string;
  email?: string;
}

export async function signDevToken(identity: DevIdentity): Promise<string> {
  return new SignJWT({ name: identity.name, email: identity.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(identity.sub)
    .setIssuer(DEV_ISSUER)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretKey());
}

export async function verifyDevToken(token: string): Promise<DevIdentity | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: DEV_ISSUER });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      name: typeof payload.name === "string" ? payload.name : payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
    };
  } catch {
    return null;
  }
}
