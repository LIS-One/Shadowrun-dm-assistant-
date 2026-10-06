import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEV_COOKIE } from "@/lib/dev-auth";

export async function GET() {
  (await cookies()).delete(DEV_COOKIE);
  redirect("/");
}
