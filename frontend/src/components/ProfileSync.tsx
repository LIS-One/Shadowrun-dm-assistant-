"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";

/**
 * Auth0 access tokens don't carry the profile, so after login we copy name/email/picture
 * from the ID-token session into the backend once per browser session.
 */
export function ProfileSync({ name, email, picture }: { name: string; email?: string; picture?: string }) {
  useEffect(() => {
    const key = `profile-synced:${name}:${email ?? ""}`;
    if (sessionStorage.getItem(key)) return;
    api("/me", { method: "PUT", json: { displayName: name, email: email ?? "", avatarUrl: picture ?? "" } })
      .then(() => sessionStorage.setItem(key, "1"))
      .catch(() => {});
  }, [name, email, picture]);
  return null;
}
