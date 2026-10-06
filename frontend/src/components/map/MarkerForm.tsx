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
            className="w-32 border border-line bg-bg/60 px-2 py-1 text-base outline-none focus:border-accent sm:text-xs"
          />
        </div>
        <div className="scrollbar-thin grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto pr-1">
          {shownTypes.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => setTypeId(t.id)}
              className={`flex min-h-11 items-center gap-2 border px-2 py-1.5 text-left text-xs transition ${
                t.id === typeId ? "border-accent bg-accent/10 text-white" : "border-line text-slate-300 hover:border-line-hi"
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
        <span className="label text-warn">Заметки мастера — никогда не видны игрокам</span>
        <textarea
          value={gmNotes}
          onChange={(e) => setGmNotes(e.target.value)}
          rows={3}
          maxLength={10000}
          className="input border-warn/40 bg-warn/5"
          placeholder="Ловушки, NPC, тайные мотивы…"
        />
      </label>

      <label className="cut-corners-sm flex min-h-14 cursor-pointer items-center justify-between gap-3 border border-line bg-bg/50 px-3 py-2.5">
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
        <span className="relative h-7 w-12 shrink-0 border border-line-hi bg-bg transition after:absolute after:left-1 after:top-1 after:h-4.5 after:w-4.5 after:bg-muted after:transition peer-checked:border-warn peer-checked:after:translate-x-5 peer-checked:after:bg-warn" />
      </label>

      <p className="font-mono text-xs text-muted">
        x {Math.round(position.x)} · y {Math.round(position.y)}
      </p>

      <div className="sticky bottom-0 -mx-1 flex gap-2 bg-panel/95 px-1 py-2">
        <button className="btn-primary flex-1" disabled={busy || !title.trim()}>
          {initial ? "Сохранить" : "Создать метку"}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>Отмена</button>
      </div>
    </form>
  );
}
