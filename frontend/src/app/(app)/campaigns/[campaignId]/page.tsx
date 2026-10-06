"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { useCampaign } from "@/components/campaign/CampaignContext";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toaster";
import { API_BASE, ApiError, api, backendUrl, errorMessage, fetcher } from "@/lib/api";
import type { GameMap } from "@/lib/types";

export default function MapsPage() {
  const { campaignId, isMaster } = useCampaign();
  const key = `/campaigns/${campaignId}/maps`;
  const { data: maps, error, mutate } = useSWR<GameMap[]>(key, fetcher);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<GameMap | null>(null);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl">Карты кампании</h2>
          <p className="text-sm text-slate-400">
            {isMaster
              ? "Загружайте карты и расставляйте метки. Скрытые метки видите только вы."
              : "Открывайте карты, изучайте метки и ведите личные заметки."}
          </p>
        </div>
        {isMaster && <button className="btn-primary w-full sm:w-auto" onClick={() => setUploading(true)}>+ Загрузить карту</button>}
      </div>

      {error && <p className="text-red-400">{errorMessage(error)}</p>}
      {maps?.length === 0 && (
        <div className="panel cut-corners hud-brackets p-8 text-center text-slate-400 sm:p-10">
          {isMaster ? "Загрузите первую карту — PNG, JPEG, GIF или WebP." : "Мастер ещё не загрузил ни одной карты."}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {maps?.map((m) => (
          <div key={m.id} className="panel cut-corners group overflow-hidden transition hover:border-accent/60">
            <Link href={`/campaigns/${campaignId}/maps/${m.id}`} className="block">
              <div className="relative aspect-video overflow-hidden bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={backendUrl(m.imageUrl)}
                  alt={m.name}
                  loading="lazy"
                  className="h-full w-full object-cover opacity-80 transition duration-300 group-hover:scale-105 group-hover:opacity-100"
                />
                <span className="chip absolute bottom-2 left-2 border-accent/50 bg-black/80 text-accent">◆ {m.markerCount} меток</span>
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              </div>
              <div className="p-4">
                <h3>{m.name}</h3>
                <p className="font-mono text-[11px] text-muted">
                  {m.width}×{m.height}px
                </p>
                {m.description && <p className="mt-1 line-clamp-2 text-sm text-slate-400">{m.description}</p>}
              </div>
            </Link>
            {isMaster && (
              <div className="flex gap-2 border-t border-line px-4 py-2">
                <button className="min-h-11 font-mono text-xs uppercase tracking-wider text-muted hover:text-accent sm:min-h-0" onClick={() => setEditing(m)}>
                  Изменить
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {uploading && (
        <UploadMapDialog
          campaignId={campaignId}
          onClose={() => setUploading(false)}
          onDone={() => {
            setUploading(false);
            mutate();
          }}
        />
      )}
      {editing && (
        <EditMapDialog
          map={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            mutate();
          }}
        />
      )}
    </>
  );
}

function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      reject(new Error("Не удалось прочитать изображение"));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

function UploadMapDialog({ campaignId, onClose, onDone }: { campaignId: number; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const file = form.get("file") as File;
    setBusy(true);
    try {
      // The server reads dimensions itself; these are only a fallback for formats like WebP.
      const { width, height } = await readImageSize(file);
      form.set("width", String(width));
      form.set("height", String(height));
      const response = await fetch(`${API_BASE}/campaigns/${campaignId}/maps`, { method: "POST", body: form });
      if (!response.ok) {
        const problem = await response.json().catch(() => ({}));
        throw new ApiError(response.status, problem.detail ?? `Ошибка ${response.status}`);
      }
      toast("Карта загружена", "success");
      onDone();
    } catch (err) {
      toast(errorMessage(err), "error");
      setBusy(false);
    }
  }

  return (
    <Modal title="Загрузить карту" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="label">Изображение (PNG, JPEG, GIF, WebP, до 50 МБ)</span>
          <input
            type="file"
            name="file"
            required
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="input file:mr-3 file:border-0 file:bg-panel-2 file:px-3 file:py-1 file:font-mono file:text-xs file:uppercase file:text-accent"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
        </label>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="max-h-48 w-full bg-black object-contain" />
        )}
        <label className="block">
          <span className="label">Название</span>
          <input name="name" required maxLength={120} className="input" placeholder="Даунтаун Сиэтла" />
        </label>
        <label className="block">
          <span className="label">Описание</span>
          <textarea name="description" rows={2} maxLength={5000} className="input" />
        </label>
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Загрузка…" : "Загрузить"}</button>
      </form>
    </Modal>
  );
}

function EditMapDialog({ map, onClose, onDone }: { map: GameMap; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const url = `/campaigns/${map.campaignId}/maps/${map.id}`;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await api(url, { method: "PUT", json: { name: form.get("name"), description: form.get("description") } });
      onDone();
    } catch (err) {
      toast(errorMessage(err), "error");
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Удалить карту «${map.name}» вместе со всеми метками?`)) return;
    try {
      await api(url, { method: "DELETE" });
      toast("Карта удалена", "success");
      onDone();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  return (
    <Modal title="Карта" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="label">Название</span>
          <input name="name" required maxLength={120} defaultValue={map.name} className="input" />
        </label>
        <label className="block">
          <span className="label">Описание</span>
          <textarea name="description" rows={3} maxLength={5000} defaultValue={map.description ?? ""} className="input" />
        </label>
        <div className="flex gap-2">
          <button className="btn-primary flex-1" disabled={busy}>Сохранить</button>
          <button type="button" className="btn-danger" onClick={remove}>Удалить</button>
        </div>
      </form>
    </Modal>
  );
}
