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
      <Link href={`/campaigns/${campaignId}/cabinet`} className="text-xs text-slate-400 hover:text-slate-200">← Кабинет</Link>
      <div className="mt-2 mb-5 flex flex-wrap items-center gap-3">
        <input
          value={name}
          readOnly={readOnly}
          onChange={(e) => setDraft({ name: e.target.value, sheet: sheet })}
          className="min-w-0 flex-1 bg-transparent text-3xl font-bold outline-none"
          aria-label="Имя персонажа"
        />
        {readOnly ? (
          <span className="chip">Только просмотр · игрок {data.ownerName}</span>
        ) : (
          <>
            <button onClick={save} disabled={!dirty || saving} className="btn-primary">
              {saving ? "Сохранение…" : dirty ? "Сохранить (Ctrl+S)" : "Сохранено"}
            </button>
            <button onClick={remove} className="btn-danger">Удалить</button>
          </>
        )}
      </div>

      {data.editable && (
        <div className="mb-5 inline-flex rounded-lg border border-line p-1 text-sm">
          <button onClick={() => setView("sheet")} className={`rounded-md px-4 py-1.5 ${view === "sheet" ? "bg-panel-2 text-white" : "text-slate-400"}`}>
            Лист персонажа
          </button>
          <button onClick={() => setView("notes")} className={`rounded-md px-4 py-1.5 ${view === "notes" ? "bg-panel-2 text-white" : "text-slate-400"}`}>
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
    </div>
  );
}
