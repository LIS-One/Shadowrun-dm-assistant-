"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { useCampaign } from "@/components/campaign/CampaignContext";
import { emptySheet, METATYPE_NAMES, ROLES, type Metatype } from "@/components/character/sheet";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toaster";
import { api, errorMessage, fetcher } from "@/lib/api";
import type { CharacterDetail, CharacterSummary, SessionLog } from "@/lib/types";

export default function CabinetPage() {
  const { campaignId, isMaster } = useCampaign();
  const base = `/campaigns/${campaignId}`;
  const { data: characters, error } = useSWR<CharacterSummary[]>(`${base}/characters`, fetcher);
  const { data: logs } = useSWR<SessionLog[]>(`${base}/session-logs`, fetcher);
  const [creating, setCreating] = useState(false);

  const mine = characters?.filter((c) => c.mine) ?? [];
  const others = characters?.filter((c) => !c.mine) ?? [];
  const recentLogs = (logs ?? []).filter((l) => l.published).slice(0, 3);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl">Мои раннеры</h2>
            <button className="btn-primary" onClick={() => setCreating(true)}>+ Персонаж</button>
          </div>
          {error && <p className="text-red-400">{errorMessage(error)}</p>}
          {characters && mine.length === 0 && (
            <div className="panel cut-corners hud-brackets p-8 text-center text-sm text-slate-400">
              Создайте раннера: лист по правилам Shadowrun 20th Anniversary Edition с подсчётом мониторов, пулов,
              инициативы и брони, плюс личный дневник.
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {mine.map((c) => <CharacterCard key={c.id} c={c} href={`${base}/characters/${c.id}`} />)}
          </div>
        </section>

        {isMaster && (
          <section>
            <h2 className="mb-1 text-xl">Раннеры игроков</h2>
            <p className="mb-4 text-sm text-muted">Как мастер вы можете просматривать листы, но редактирует их только игрок.</p>
            {others.length === 0 && <p className="text-sm text-slate-500">Игроки ещё не создали персонажей.</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              {others.map((c) => <CharacterCard key={c.id} c={c} href={`${base}/characters/${c.id}`} showOwner />)}
            </div>
          </section>
        )}
      </div>

      <aside>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl">Прошлые забеги</h2>
          <Link href={`${base}/logs`} className="font-mono text-xs uppercase text-accent hover:underline">Все логи →</Link>
        </div>
        {recentLogs.length === 0 && <p className="text-sm text-slate-500">Логов сессий пока нет.</p>}
        <div className="space-y-3">
          {recentLogs.map((l) => (
            <Link key={l.id} href={`${base}/logs?log=${l.id}`} className="card-link p-4">
              <p className="font-mono text-[11px] text-muted">
                {l.sessionNumber != null && `Сессия #${l.sessionNumber}`}
                {l.playedOn && ` · ${new Date(l.playedOn).toLocaleDateString("ru-RU")}`}
              </p>
              <h3 className="text-base">{l.title}</h3>
              {l.summary && <p className="mt-1 line-clamp-3 text-sm text-slate-400">{l.summary}</p>}
            </Link>
          ))}
        </div>
      </aside>

      {creating && <CreateCharacterDialog base={base} onClose={() => setCreating(false)} />}
    </div>
  );
}

function CharacterCard({ c, href, showOwner }: { c: CharacterSummary; href: string; showOwner?: boolean }) {
  return (
    <Link href={href} className="card-link">
      <div className="flex items-center gap-3">
        <span className="cut-corners-sm grid h-12 w-12 shrink-0 place-items-center border border-accent/40 bg-accent/10 font-display text-xl text-accent">
          {c.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-base">{c.name}</h3>
          <p className="truncate font-mono text-[11px] text-muted">{[c.metatype, c.role].filter(Boolean).join(" · ") || "—"}</p>
        </div>
      </div>
      {showOwner && <p className="mt-3 font-mono text-[11px] text-muted">Игрок: {c.ownerName}</p>}
    </Link>
  );
}

function CreateCharacterDialog({ base, onClose }: { base: string; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const sheet = { ...emptySheet(form.get("metatype") as Metatype), role: String(form.get("role") ?? "") };
      const created = await api<CharacterDetail>(`${base}/characters`, {
        method: "POST",
        json: { name: form.get("name"), sheet },
      });
      router.push(`${base}/characters/${created.id}`);
    } catch (err) {
      toast(errorMessage(err), "error");
      setBusy(false);
    }
  }

  return (
    <Modal title="Новый персонаж" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="label">Уличное имя</span>
          <input name="name" required maxLength={120} className="input" placeholder="Призрак" autoFocus />
        </label>
        <label className="block">
          <span className="label">Метатип</span>
          <select name="metatype" className="input">{METATYPE_NAMES.map((m) => <option key={m}>{m}</option>)}</select>
        </label>
        <label className="block">
          <span className="label">Роль</span>
          <input name="role" list="new-roles" className="input" placeholder="Декер" />
          <datalist id="new-roles">{ROLES.map((r) => <option key={r} value={r} />)}</datalist>
        </label>
        <button className="btn-primary w-full" disabled={busy}>Создать</button>
      </form>
    </Modal>
  );
}
