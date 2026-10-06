"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEV_COOKIE, isDevAuth, signDevToken } from "@/lib/dev-auth";
import { safeReturnTo } from "@/lib/safe-return-to";

export async function devLogin(formData: FormData) {
  if (!isDevAuth()) {
    throw new Error("Dev login is disabled");
  }
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (!name) {
    redirect("/dev-login?error=name");
  }
  const slug = name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "runner";
  const token = await signDevToken({ sub: `dev|${slug}`, name, email: `${slug}@dev.local` });
  (await cookies()).set(DEV_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  redirect(safeReturnTo(formData.get("returnTo")));
}
