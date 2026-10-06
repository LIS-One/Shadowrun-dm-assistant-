"use client";

import { useMemo, useState } from "react";
import type { Marker, MarkerInput, MarkerType, MarkerVisibility } from "@/lib/types";
import { MarkerGlyph } from "./MarkerGlyph";

export function MarkerForm({
  types,
  initial,
  position,
  onSubmit,
  onCancel,
}: {
  types: MarkerType[];
  initial?: Marker;
  position: { x: number; y: number };
  onSubmit: (input: MarkerInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [typeId, setTypeId] = useState<number>(initial?.typeId ?? types[0]?.id);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [gmNotes, setGmNotes] = useState(initial?.gmNotes ?? "");
  const [visibility, setVisibility] = useState<MarkerVisibility>(initial?.visibility ?? "VISIBLE");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");

  const shownTypes = useMemo(
    () => types.filter((t) => t.name.toLowerCase().includes(filter.trim().toLowerCase())),
    [types, filter],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit({ typeId, title, description, gmNotes, visibility, x: position.x, y: position.y });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="label mb-0">Тип локации</span>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Фильтр…"
            className="w-28 rounded border border-line bg-bg/60 px-2 py-0.5 text-xs outline-none focus:border-accent"
          />
        </div>
        <div className="scrollbar-thin grid max-h-48 grid-cols-2 gap-1.5 overflow-y-auto pr-1">
          {shownTypes.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => setTypeId(t.id)}
              className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs transition ${
                t.id === typeId ? "border-accent bg-accent/10 text-white" : "border-line text-slate-300 hover:border-slate-500"
              }`}
            >
              <MarkerGlyph shape={t.shape} color={t.color} icon={t.icon} size={22} />
              <span className="line-clamp-2">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="label">Название</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} className="input" autoFocus />
      </label>

      <label className="block">
        <span className="label">Описание (видят игроки)</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={10000} className="input" />
      </label>

      <label className="block">
        <span className="label text-amber-300/90">🔒 Заметки мастера (никогда не видны игрокам)</span>
        <textarea
          value={gmNotes}
          onChange={(e) => setGmNotes(e.target.value)}
          rows={3}
          maxLength={10000}
          className="input border-amber-500/30 bg-amber-500/5"
          placeholder="Ловушки, NPC, тайные мотивы…"
        />
      </label>

      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-line bg-bg/50 px-3 py-2.5">
        <span>
          <span className="block text-sm font-medium">Скрыть от игроков</span>
          <span className="block text-xs text-slate-400">Метку видят только мастера, пока вы её не откроете</span>
        </span>
        <input
          type="checkbox"
          className="peer sr-only"
          checked={visibility === "HIDDEN"}
          onChange={(e) => setVisibility(e.target.checked ? "HIDDEN" : "VISIBLE")}
        />
        <span className="relative h-6 w-11 shrink-0 rounded-full bg-slate-700 transition after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:bg-amber-500 peer-checked:after:translate-x-5" />
      </label>

      <p className="font-mono text-xs text-slate-500">
        x {Math.round(position.x)} · y {Math.round(position.y)}
      </p>

      <div className="flex gap-2">
        <button className="btn-primary flex-1" disabled={busy || !title.trim()}>
          {initial ? "Сохранить" : "Создать метку"}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>Отмена</button>
      </div>
    </form>
  );
}
