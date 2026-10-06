import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuth0 } from "./lib/auth0";

export async function proxy(request: NextRequest) {
  if (process.env.AUTH_MODE === "dev") {
    return NextResponse.next();
  }
  // Mounts /auth/login, /auth/callback, /auth/logout and keeps the session cookie rolling.
  return await getAuth0().middleware(request);
}

export const config = {
  matcher: [
    // The API proxy is excluded: proxy.ts buffers request bodies (10 MB cap), which would
    // truncate large map uploads. The route handler authenticates on its own.
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/backend).*)",
  ],
};
