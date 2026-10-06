"use client";

import { useState } from "react";
import useSWR from "swr";
import { useToast } from "@/components/Toaster";
import { api, errorMessage, fetcher } from "@/lib/api";
import type { CharacterNote } from "@/lib/types";

/** The player's private journal for one character. */
export function CharacterNotes({ url }: { url: string }) {
  const toast = useToast();
  const { data: notes, mutate } = useSWR<CharacterNote[]>(url, fetcher);
  const [editing, setEditing] = useState<CharacterNote | "new" | null>(null);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const json = { title: form.get("title"), content: form.get("content") };
    try {
      if (editing === "new") await api(url, { method: "POST", json });
      else if (editing) await api(`${url}/${editing.id}`, { method: "PUT", json });
      setEditing(null);
      mutate();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  async function remove(note: CharacterNote) {
    if (!confirm(`Удалить заметку «${note.title}»?`)) return;
    try {
      await api(`${url}/${note.id}`, { method: "DELETE" });
      mutate();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg">Дневник раннера</h3>
          <p className="text-xs text-muted">Личные заметки — их видите только вы.</p>
        </div>
        {editing === null && <button className="btn-primary" onClick={() => setEditing("new")}>+ Заметка</button>}
      </div>

      {editing !== null && (
        <form onSubmit={save} className="panel cut-corners mb-4 space-y-3 p-4">
          <input
            name="title"
            required
            maxLength={160}
            defaultValue={editing === "new" ? "" : editing.title}
            placeholder="Заголовок"
            className="input"
            autoFocus
          />
          <textarea
            name="content"
            rows={6}
            maxLength={20000}
            defaultValue={editing === "new" ? "" : (editing.content ?? "")}
            placeholder="Долги, подозрения, планы на следующий забег…"
            className="input"
          />
          <div className="flex gap-2">
            <button className="btn-primary">Сохранить</button>
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Отмена</button>
          </div>
        </form>
      )}

      {notes?.length === 0 && editing === null && <p className="text-sm text-muted">Заметок пока нет.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {notes?.map((n) => (
          <article key={n.id} className="panel cut-corners p-4">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-display">{n.title}</h4>
              <div className="flex shrink-0 font-mono text-[11px] uppercase text-muted">
                <button className="min-h-9 px-2 hover:text-accent" onClick={() => setEditing(n)}>изменить</button>
                <button className="min-h-9 px-2 hover:text-red-300" onClick={() => remove(n)}>удалить</button>
              </div>
            </div>
            {n.content && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{n.content}</p>}
            <p className="mt-2 font-mono text-[11px] text-slate-600">{new Date(n.updatedAt).toLocaleString("ru-RU")}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
