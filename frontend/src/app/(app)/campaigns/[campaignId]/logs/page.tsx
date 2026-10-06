"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { useCampaign } from "@/components/campaign/CampaignContext";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toaster";
import { api, errorMessage, fetcher } from "@/lib/api";
import type { SessionLog } from "@/lib/types";

export default function LogsPage() {
  const { campaignId, isMaster } = useCampaign();
  const router = useRouter();
  const params = useSearchParams();
  const url = `/campaigns/${campaignId}/session-logs`;
  const { data: logs, error, mutate } = useSWR<SessionLog[]>(url, fetcher);
  const [editing, setEditing] = useState<SessionLog | "new" | null>(null);

  const openId = Number(params.get("log")) || null;
  const open = logs?.find((l) => l.id === openId) ?? null;
  const setOpen = (id: number | null) => router.replace(id ? `?log=${id}` : "?", { scroll: false });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl">Хроника забегов</h2>
          <p className="text-sm text-muted">
            {isMaster ? "Записывайте, что произошло на сессии. Черновики видят только мастера." : "Хроника прошедших забегов."}
          </p>
        </div>
        {isMaster && <button className="btn-primary w-full sm:w-auto" onClick={() => setEditing("new")}>+ Новый лог</button>}
      </div>

      {error && <p className="text-red-400">{errorMessage(error)}</p>}
      {logs?.length === 0 && <div className="panel cut-corners hud-brackets p-10 text-center text-slate-400">Логов пока нет.</div>}

      <ol className="relative space-y-4 border-l border-line pl-5 sm:pl-6">
        {logs?.map((l) => (
          <li key={l.id} className="relative">
            <span className={`absolute -left-[26px] top-6 h-3 w-3 rotate-45 border-2 border-bg sm:-left-[30px] ${l.published ? "bg-accent shadow-[0_0_8px_#3dff9e]" : "bg-slate-600"}`} />
            <button onClick={() => setOpen(l.id)} className="card-link w-full text-left">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted">
                {l.sessionNumber != null && <span className="font-mono text-accent">#{l.sessionNumber}</span>}
                {l.playedOn && <span>{new Date(l.playedOn).toLocaleDateString("ru-RU", { dateStyle: "long" })}</span>}
                {!l.published && <span className="chip border-slate-500 text-slate-300">Черновик</span>}
              </div>
              <h3 className="mt-1 text-lg">{l.title}</h3>
              {l.summary && <p className="mt-1 text-sm text-slate-400">{l.summary}</p>}
            </button>
          </li>
        ))}
      </ol>

      {open && (
        <Modal title={open.title} onClose={() => setOpen(null)} wide>
          <p className="mb-4 font-mono text-[11px] text-muted">
            {open.sessionNumber != null && `Сессия #${open.sessionNumber} · `}
            {open.playedOn && `${new Date(open.playedOn).toLocaleDateString("ru-RU", { dateStyle: "long" })} · `}
            {open.authorName && `автор: ${open.authorName}`}
          </p>
          {open.summary && <p className="mb-4 border-l-2 border-accent bg-bg/50 p-3 text-sm italic text-slate-300">{open.summary}</p>}
          {open.content ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{open.content}</div>
          ) : (
            <p className="text-sm text-slate-500">Подробностей нет.</p>
          )}
          {isMaster && (
            <div className="mt-6 flex gap-2 border-t border-line pt-4">
              <button
                className="btn-ghost"
                onClick={() => {
                  setEditing(open);
                  setOpen(null);
                }}
              >
                Редактировать
              </button>
            </div>
          )}
        </Modal>
      )}

      {editing && (
        <LogEditor
          url={url}
          log={editing === "new" ? null : editing}
          nextNumber={(logs ?? []).reduce((max, l) => Math.max(max, l.sessionNumber ?? 0), 0) + 1}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            mutate();
          }}
        />
      )}
    </>
  );
}

function LogEditor({
  url,
  log,
  nextNumber,
  onClose,
  onSaved,
}: {
  url: string;
  log: SessionLog | null;
  nextNumber: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const json = {
      sessionNumber: form.get("sessionNumber") ? Number(form.get("sessionNumber")) : null,
      title: form.get("title"),
      playedOn: form.get("playedOn") || null,
      summary: form.get("summary"),
      content: form.get("content"),
      published: form.get("published") === "on",
    };
    setBusy(true);
    try {
      await api(log ? `${url}/${log.id}` : url, { method: log ? "PUT" : "POST", json });
      toast(json.published ? "Лог опубликован" : "Черновик сохранён", "success");
      onSaved();
    } catch (err) {
      toast(errorMessage(err), "error");
      setBusy(false);
    }
  }

  async function remove() {
    if (!log || !confirm(`Удалить лог «${log.title}»?`)) return;
    try {
      await api(`${url}/${log.id}`, { method: "DELETE" });
      onSaved();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  return (
    <Modal title={log ? "Редактировать лог" : "Новый лог сессии"} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[90px_1fr_170px]">
          <label className="block">
            <span className="label">№</span>
            <input name="sessionNumber" type="number" min={0} defaultValue={log?.sessionNumber ?? nextNumber} className="input" />
          </label>
          <label className="col-span-2 block sm:order-none sm:col-span-1">
            <span className="label">Название</span>
            <input name="title" required maxLength={200} defaultValue={log?.title ?? ""} className="input" placeholder="Налёт на склад Aztechnology" />
          </label>
          <label className="block">
            <span className="label">Дата игры</span>
            <input name="playedOn" type="date" defaultValue={log?.playedOn ?? new Date().toISOString().slice(0, 10)} className="input" />
          </label>
        </div>
        <label className="block">
          <span className="label">Кратко</span>
          <textarea name="summary" rows={2} maxLength={2000} defaultValue={log?.summary ?? ""} className="input" />
        </label>
        <label className="block">
          <span className="label">Подробный отчёт</span>
          <textarea name="content" rows={12} maxLength={100000} defaultValue={log?.content ?? ""} className="input font-mono text-[13px]" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="published" defaultChecked={log?.published ?? true} className="h-4 w-4 accent-cyan-400" />
          Опубликовать — лог увидят игроки
        </label>
        <div className="flex gap-2">
          <button className="btn-primary flex-1" disabled={busy}>Сохранить</button>
          {log && <button type="button" className="btn-danger" onClick={remove}>Удалить</button>}
        </div>
      </form>
    </Modal>
  );
}
