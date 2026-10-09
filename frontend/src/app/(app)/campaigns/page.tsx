"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toaster";
import { api, errorMessage, fetcher } from "@/lib/api";
import { normalizeInviteCode } from "@/lib/invite-code";
import { ROLE_LABELS, type Campaign } from "@/lib/types";

const ROLE_STYLES = {
  OWNER: "border-warn/60 text-warn",
  MASTER: "border-accent-2/60 text-accent-2",
  PLAYER: "border-accent/60 text-accent",
} as const;

export default function CampaignsPage() {
  const { data: campaigns, error, isLoading } = useSWR<Campaign[]>("/campaigns", fetcher);
  const [dialog, setDialog] = useState<"create" | "join" | null>(null);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 pb-[calc(2rem+var(--safe-bottom))] sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
        <div>
          <p className="kicker">{"// кампании"}</p>
          <h1 className="mt-1 text-3xl">Ваши забеги</h1>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <button className="btn-ghost" onClick={() => setDialog("join")}>По коду</button>
          <button className="btn-primary" onClick={() => setDialog("create")}>+ Кампания</button>
        </div>
      </div>

      {isLoading && <p className="text-slate-400">Загрузка…</p>}
      {error && <p className="text-red-400">{errorMessage(error)}</p>}
      {campaigns && campaigns.length === 0 && (
        <div className="panel cut-corners hud-brackets p-8 text-center sm:p-10">
          <h2 className="text-lg">Пока ни одной кампании</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Создайте свою кампанию — вы станете её владельцем — или введите код приглашения, который дал мастер.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns?.map((c) => (
          <Link key={c.id} href={`/campaigns/${c.id}`} className="card-link">
            <div className="mb-3 flex items-center justify-between">
              <span className={`chip ${ROLE_STYLES[c.myRole]}`}>{ROLE_LABELS[c.myRole]}</span>
              <span className="font-mono text-[11px] text-muted">{c.memberCount} участн.</span>
            </div>
            <h2 className="text-lg">{c.name}</h2>
            {c.description && <p className="mt-1 line-clamp-2 text-sm text-slate-400">{c.description}</p>}
          </Link>
        ))}
      </div>

      {dialog === "create" && <CreateCampaignDialog onClose={() => setDialog(null)} />}
      {dialog === "join" && <JoinCampaignDialog onClose={() => setDialog(null)} />}
    </main>
  );
}

function CreateCampaignDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const campaign = await api<Campaign>("/campaigns", {
        method: "POST",
        json: { name: form.get("name"), description: form.get("description") },
      });
      router.push(`/campaigns/${campaign.id}`);
    } catch (err) {
      toast(errorMessage(err), "error");
      setBusy(false);
    }
  }

  return (
    <Modal title="Новая кампания" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="label">Название</span>
          <input name="name" required maxLength={120} className="input" placeholder="Сиэтл, 2072" autoFocus />
        </label>
        <label className="block">
          <span className="label">Описание</span>
          <textarea name="description" rows={3} maxLength={5000} className="input" placeholder="О чём эта история?" />
        </label>
        <button className="btn-primary w-full" disabled={busy}>Создать</button>
      </form>
    </Modal>
  );
}

function JoinCampaignDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      // Accept a pasted invite link as well as the bare code.
      const raw = String(form.get("inviteCode") ?? "");
      const inviteCode = normalizeInviteCode(raw.includes("/join/") ? raw.split("/join/")[1] : raw);
      const campaign = await api<Campaign>("/campaigns/join", { method: "POST", json: { inviteCode } });
      router.push(`/campaigns/${campaign.id}`);
    } catch (err) {
      toast(errorMessage(err), "error");
      setBusy(false);
    }
  }

  return (
    <Modal title="Присоединиться к кампании" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="label">Код или ссылка-приглашение</span>
          <input
            name="inviteCode"
            required
            maxLength={300}
            autoCapitalize="characters"
            className="input font-mono tracking-widest"
            placeholder="ABCD2345EF"
            autoFocus
          />
        </label>
        <p className="text-xs text-slate-400">Код выдаёт владелец или мастер кампании. Вы присоединитесь как игрок.</p>
        <button className="btn-primary w-full" disabled={busy}>Присоединиться</button>
      </form>
    </Modal>
  );
}
