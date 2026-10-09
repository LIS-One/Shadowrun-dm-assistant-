"use server";

import { redirect } from "next/navigation";
import { normalizeInviteCode } from "@/lib/invite-code";
import { getBackendToken, loginUrl } from "@/lib/session";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

export interface JoinState {
  error: string | null;
}

/** Server action, so Next.js' built-in Origin check protects it from cross-site submits. */
export async function joinCampaign(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const code = normalizeInviteCode(String(formData.get("code") ?? ""));
  const token = await getBackendToken();
  if (!token) redirect(loginUrl(`/join/${code}`));

  let campaignId: number | null = null;
  try {
    const response = await fetch(`${BACKEND_URL}/api/campaigns/join`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ inviteCode: code }),
      cache: "no-store",
    });
    if (response.status === 404) {
      return { error: "Код приглашения не найден. Возможно, мастер сгенерировал новый — попросите свежую ссылку." };
    }
    if (!response.ok) {
      return { error: `Не удалось присоединиться (ошибка ${response.status}).` };
    }
    campaignId = (await response.json()).id;
  } catch {
    return { error: "Сервер недоступен, попробуйте ещё раз через минуту." };
  }
  redirect(`/campaigns/${campaignId}`);
}
