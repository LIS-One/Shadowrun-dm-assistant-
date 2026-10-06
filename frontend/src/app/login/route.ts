import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { safeReturnTo } from "@/lib/safe-return-to";
import { loginUrl } from "@/lib/session";

/** Mode-independent login entry point (Auth0 or dev login) for client-side redirects. */
export function GET(request: NextRequest) {
  redirect(loginUrl(safeReturnTo(request.nextUrl.searchParams.get("returnTo"))));
}
