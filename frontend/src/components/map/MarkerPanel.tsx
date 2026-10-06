"use client";

import { useState } from "react";
import { IconEdit, IconEye, IconEyeOff, IconLock, IconTrash } from "@/components/icons";
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
      <div
        className="relative -mx-5 mb-4 h-20 overflow-hidden border-b border-line"
        style={{ background: `linear-gradient(120deg, ${color}40, transparent 70%), repeating-linear-gradient(90deg, ${color}14 0 1px, transparent 1px 12px)` }}
      >
        <div className="absolute bottom-3 left-5 flex items-center gap-3">
          {type && <MarkerGlyph shape={type.shape} color={type.color} icon={type.icon} hidden={hidden} size={40} />}
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-200">{type?.name}</span>
        </div>
      </div>

      <h2 className="pr-10 text-xl leading-snug">{marker.title}</h2>
      {masterMode && (
        <div className="mt-2">
          {hidden ? (
            <span className="chip border-warn/60 bg-warn/10 text-warn"><IconEyeOff className="h-3.5 w-3.5" /> Скрыта от игроков</span>
          ) : (
            <span className="chip border-accent/50 bg-accent/10 text-accent"><IconEye className="h-3.5 w-3.5" /> Видна игрокам</span>
          )}
        </div>
      )}

      {masterMode && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <ActionButton onClick={onEdit} icon={<IconEdit />} label="Изменить" />
          <ActionButton onClick={onToggleVisibility} icon={hidden ? <IconEye /> : <IconEyeOff />} label={hidden ? "Открыть" : "Скрыть"} highlight={hidden} />
          <ActionButton onClick={onDelete} icon={<IconTrash />} label="Удалить" danger />
        </div>
      )}

      <section className="mt-5">
        {marker.description ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{marker.description}</p>
        ) : (
          <p className="text-sm italic text-muted">Описания нет.</p>
        )}
      </section>

      {masterMode && marker.gmNotes && (
        <section className="cut-corners-sm mt-4 border border-warn/40 bg-warn/5 p-3">
          <h3 className="mb-1 flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-warn">
            <IconLock className="h-3.5 w-3.5" /> Заметки мастера
          </h3>
          <p className="whitespace-pre-wrap text-sm text-amber-100/90">{marker.gmNotes}</p>
        </section>
      )}

      {masterMode && <p className="mt-3 text-xs text-muted">Перетащите метку на карте, чтобы переместить её.</p>}

      <MyNotes notes={notes} onAdd={onAddNote} onUpdate={onUpdateNote} onDelete={onDeleteNote} />

      <p className="mt-6 font-mono text-[11px] text-slate-600">
        x {Math.round(marker.x)} · y {Math.round(marker.y)}
      </p>
    </div>
  );
}

function ActionButton({
  onClick,
  icon,
  label,
  danger,
  highlight,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`cut-corners-sm flex min-h-14 flex-col items-center justify-center gap-1 border px-2 py-2 font-mono text-[11px] uppercase tracking-wider transition ${
        danger
          ? "border-danger/40 text-red-300 hover:bg-danger/10"
          : highlight
            ? "border-accent/60 bg-accent/10 text-accent hover:bg-accent/20"
            : "border-line-hi text-slate-200 hover:border-accent/60 hover:text-accent"
      }`}
    >
      {icon}
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
      <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-accent">{"// мои заметки"}</h3>
      <p className="mb-3 mt-1 text-xs text-muted">Видны только вам: ни мастер, ни другие игроки их не видят.</p>
      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="cut-corners-sm border border-line bg-bg/50 p-2.5 text-sm">
            {editingId === n.id ? (
              <div className="space-y-2">
                <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} className="input" autoFocus />
                <div className="flex gap-2">
                  <button
                    className="btn-primary"
                    disabled={!editText.trim()}
                    onClick={async () => {
                      await onUpdate(n.id, editText);
                      setEditingId(null);
                    }}
                  >
                    Сохранить
                  </button>
                  <button className="btn-ghost" onClick={() => setEditingId(null)}>Отмена</button>
                </div>
              </div>
            ) : (
              <>
                <p className="whitespace-pre-wrap text-slate-200">{n.content}</p>
                <div className="mt-1 flex items-center gap-1 font-mono text-[11px] text-muted">
                  <span>{new Date(n.updatedAt).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}</span>
                  <button
                    className="min-h-9 px-2 uppercase hover:text-accent"
                    onClick={() => {
                      setEditingId(n.id);
                      setEditText(n.content);
                    }}
                  >
                    изменить
                  </button>
                  <button className="min-h-9 px-2 uppercase hover:text-red-300" onClick={() => confirm("Удалить заметку?") && onDelete(n.id)}>
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
        <button className="btn-ghost w-full" disabled={busy || !draft.trim()}>+ Добавить заметку</button>
      </form>
    </section>
  );
}
