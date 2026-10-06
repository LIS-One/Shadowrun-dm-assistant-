"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { useCampaign } from "@/components/campaign/CampaignContext";
import { CharacterNotes } from "@/components/character/CharacterNotes";
import { CharacterSheet } from "@/components/character/CharacterSheet";
import { normalizeSheet, type Sheet } from "@/components/character/sheet";
import { useToast } from "@/components/Toaster";
import { api, errorMessage, fetcher } from "@/lib/api";
import type { CharacterDetail } from "@/lib/types";

export default function CharacterPage(props: PageProps<"/campaigns/[campaignId]/characters/[characterId]">) {
  const { characterId } = use(props.params);
  const { campaignId } = useCampaign();
  const router = useRouter();
  const toast = useToast();
  const url = `/campaigns/${campaignId}/characters/${characterId}`;
  const { data, error, mutate } = useSWR<CharacterDetail>(url, fetcher, { revalidateOnFocus: false });

  // Unsaved edits live in `draft`; without a draft the page shows the server copy.
  const [draft, setDraft] = useState<{ name: string; sheet: Sheet } | null>(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"sheet" | "notes">("sheet");
  const dirty = draft !== null;
  const name = draft?.name ?? data?.name ?? "";
  const sheet = draft?.sheet ?? (data ? normalizeSheet(data.sheet) : null);

  const save = useCallback(async () => {
    if (!sheet || !data?.editable) return;
    setSaving(true);
    try {
      const updated = await api<CharacterDetail>(url, { method: "PUT", json: { name, sheet } });
      await mutate(updated, { revalidate: false });
      setDraft(null);
      toast("Лист сохранён", "success");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }, [sheet, data?.editable, url, name, mutate, toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (dirty) save();
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [dirty, save]);

  async function remove() {
    if (!data || !confirm(`Удалить персонажа «${data.name}» вместе с дневником?`)) return;
    try {
      await api(url, { method: "DELETE" });
      router.push(`/campaigns/${campaignId}/cabinet`);
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  if (error) return <p className="text-red-400">{errorMessage(error)}</p>;
  if (!data || !sheet) return <p className="text-slate-400">Загрузка…</p>;

  const readOnly = !data.editable;

  return (
    <div>
      <Link href={`/campaigns/${campaignId}/cabinet`} className="font-mono text-[11px] uppercase tracking-wider text-muted hover:text-accent">← Кабинет</Link>
      <div className="mt-2 mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <p className="kicker">{"// раннер · SR4A"}</p>
          <input
            value={name}
            readOnly={readOnly}
            onChange={(e) => setDraft({ name: e.target.value, sheet: sheet })}
            className="w-full min-w-0 bg-transparent font-display text-3xl text-slate-100 outline-none sm:text-4xl"
            aria-label="Имя персонажа"
          />
          <p className="font-mono text-xs text-muted">{[sheet.metatype, sheet.role].filter(Boolean).join(" · ")}</p>
        </div>
        {readOnly ? (
          <span className="chip border-info/50 text-info">Только просмотр · игрок {data.ownerName}</span>
        ) : (
          <div className="hidden gap-2 sm:flex">
            <button onClick={save} disabled={!dirty || saving} className="btn-primary">
              {saving ? "Сохранение…" : dirty ? "Сохранить · Ctrl+S" : "Сохранено"}
            </button>
            <button onClick={remove} className="btn-danger">Удалить</button>
          </div>
        )}
      </div>

      {data.editable && (
        <div className="mb-4 grid grid-cols-2 border border-line p-1 font-mono text-xs uppercase tracking-wider sm:inline-grid">
          <button onClick={() => setView("sheet")} className={`min-h-10 px-4 ${view === "sheet" ? "bg-accent text-black" : "text-muted"}`}>
            Лист
          </button>
          <button onClick={() => setView("notes")} className={`min-h-10 px-4 ${view === "notes" ? "bg-accent text-black" : "text-muted"}`}>
            Дневник
          </button>
        </div>
      )}

      {view === "sheet" || !data.editable ? (
        <CharacterSheet
          sheet={sheet}
          readOnly={readOnly}
          onChange={(s) => setDraft({ name, sheet: s })}
        />
      ) : (
        <CharacterNotes url={`${url}/notes`} />
      )}

      {data.editable && (
        <div className="mt-8 sm:hidden">
          <button onClick={remove} className="btn-danger w-full">Удалить персонажа</button>
        </div>
      )}

      {/* phones: save bar above the tab bar while there are unsaved changes */}
      {data.editable && dirty && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+var(--safe-bottom))] z-30 border-t border-accent/40 bg-bg/95 px-4 py-2 backdrop-blur sm:hidden">
          <button onClick={save} disabled={saving} className="btn-primary w-full">
            {saving ? "Сохранение…" : "Сохранить изменения"}
          </button>
        </div>
      )}
    </div>
  );
}
