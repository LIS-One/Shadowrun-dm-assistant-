"use client";

import { useActionState } from "react";
import { joinCampaign, type JoinState } from "./actions";

export function JoinForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState<JoinState, FormData>(joinCampaign, { error: null });
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="code" value={code} />
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Подключение…" : "Присоединиться"}
      </button>
      {state.error && <p className="text-sm text-red-300">{state.error}</p>}
    </form>
  );
}
