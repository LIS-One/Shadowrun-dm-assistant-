"use client";

import { useState } from "react";
import type { Marker, MarkerNote, MarkerType } from "@/lib/types";
import { MarkerGlyph } from "./MarkerGlyph";

export function MarkerDetails({
  marker,
  type,
  masterMode,
  notes,
  onEdit,
  onToggleVisibility,
  onDelete,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: {
  marker: Marker;
  type: MarkerType | undefined;
  masterMode: boolean;
  notes: MarkerNote[];
  onEdit: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onAddNote: (content: string) => Promise<void>;
  onUpdateNote: (noteId: number, content: string) => Promise<void>;
  onDeleteNote: (noteId: number) => Promise<void>;
}) {
  const hidden = marker.visibility === "HIDDEN";
  const color = type?.color ?? "#94A3B8";

  return (
    <div>
      <div className="relative -mx-5 -mt-5 mb-4 h-24 overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}55, transparent)` }}>
        <div className="absolute bottom-3 left-5 flex items-center gap-3">
          {type && <MarkerGlyph shape={type.shape} color={type.color} icon={type.icon} hidden={hidden} size={40} />}
          <span className="text-xs font-medium uppercase tracking-wider text-slate-200">{type?.name}</span>
        </div>
      </div>

      <h2 className="text-xl font-semibold leading-snug">{marker.title}</h2>
      {masterMode && (
        <div className="mt-2">
          {hidden ? (
            <span className="chip border-amber-500/50 bg-amber-500/10 text-amber-300">◌ Скрыта от игроков</span>
          ) : (
            <span className="chip border-emerald-500/40 bg-emerald-500/10 text-emerald-300">● Видна игрокам</span>
          )}
        </div>
      )}

      {masterMode && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <ActionButton onClick={onEdit} icon="✎" label="Изменить" />
          <ActionButton onClick={onToggleVisibility} icon={hidden ? "👁" : "◌"} label={hidden ? "Открыть" : "Скрыть"} />
          <ActionButton onClick={onDelete} icon="🗑" label="Удалить" danger />
        </div>
      )}

      <section className="mt-5">
        {marker.description ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{marker.description}</p>
        ) : (
          <p className="text-sm italic text-slate-500">Описания нет.</p>
        )}
      </section>

      {masterMode && marker.gmNotes && (
        <section className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-300">🔒 Заметки мастера</h3>
          <p className="whitespace-pre-wrap text-sm text-amber-100/90">{marker.gmNotes}</p>
        </section>
      )}

      {masterMode && <p className="mt-3 text-xs text-slate-500">Перетащите метку на карте, чтобы переместить её.</p>}

      <MyNotes notes={notes} onAdd={onAddNote} onUpdate={onUpdateNote} onDelete={onDeleteNote} />

      <p className="mt-6 font-mono text-[11px] text-slate-600">
        x {Math.round(marker.x)} · y {Math.round(marker.y)}
      </p>
    </div>
  );
}

function ActionButton({ onClick, icon, label, danger }: { onClick: () => void; icon: string; label: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-xs transition ${
        danger ? "border-red-500/30 text-red-300 hover:bg-red-500/10" : "border-line text-slate-200 hover:border-accent/60 hover:bg-accent/5"
      }`}
    >
      <span className="text-base leading-none">{icon}</span>
      {label}
    </button>
  );
}

function MyNotes({
  notes,
  onAdd,
  onUpdate,
  onDelete,
}: {
  notes: MarkerNote[];
  onAdd: (content: string) => Promise<void>;
  onUpdate: (id: number, content: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    try {
      await onAdd(draft);
      setDraft("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 border-t border-line pt-4">
      <h3 className="text-sm font-semibold">Мои заметки</h3>
      <p className="mb-3 text-xs text-slate-500">Видны только вам, ни мастер, ни другие игроки их не видят.</p>
      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="rounded-lg border border-line bg-bg/50 p-2.5 text-sm">
            {editingId === n.id ? (
              <div className="space-y-2">
                <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} className="input" autoFocus />
                <div className="flex gap-2">
                  <button
                    className="btn-primary px-3 py-1 text-xs"
                    disabled={!editText.trim()}
                    onClick={async () => {
                      await onUpdate(n.id, editText);
                      setEditingId(null);
                    }}
                  >
                    Сохранить
                  </button>
                  <button className="btn-ghost px-3 py-1 text-xs" onClick={() => setEditingId(null)}>Отмена</button>
                </div>
              </div>
            ) : (
              <>
                <p className="whitespace-pre-wrap text-slate-200">{n.content}</p>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500">
                  <span>{new Date(n.updatedAt).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}</span>
                  <button
                    className="hover:text-white"
                    onClick={() => {
                      setEditingId(n.id);
                      setEditText(n.content);
                    }}
                  >
                    изменить
                  </button>
                  <button className="hover:text-red-300" onClick={() => confirm("Удалить заметку?") && onDelete(n.id)}>
                    удалить
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-3 space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          maxLength={10000}
          className="input"
          placeholder="Добавить личную заметку…"
        />
        <button className="btn-ghost w-full text-xs" disabled={busy || !draft.trim()}>+ Добавить заметку</button>
      </form>
    </section>
  );
}
