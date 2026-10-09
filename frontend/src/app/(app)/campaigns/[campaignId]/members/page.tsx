"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { useCampaign } from "@/components/campaign/CampaignContext";
import { MarkerGlyph } from "@/components/map/MarkerGlyph";
import { SHAPE_LABELS, SHAPES } from "@/components/map/markerIcon";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toaster";
import { api, errorMessage, fetcher } from "@/lib/api";
import { ROLE_LABELS, type Campaign, type CampaignRole, type MarkerShape, type MarkerType, type Me, type Member } from "@/lib/types";

function inviteLink(code: string): string {
  return `${window.location.origin}/join/${code}`;
}

export default function MembersPage() {
  const { campaignId, campaign, isOwner, isMaster, mutate: mutateCampaign } = useCampaign();
  const router = useRouter();
  const toast = useToast();
  const base = `/campaigns/${campaignId}`;
  const { data: members, mutate } = useSWR<Member[]>(`${base}/members`, fetcher);
  const { data: me } = useSWR<Me>("/me", fetcher);

  async function changeRole(member: Member, role: CampaignRole) {
    try {
      await api(`${base}/members/${member.id}`, { method: "PATCH", json: { role } });
      mutate();
      toast(`${member.displayName}: ${ROLE_LABELS[role]}`, "success");
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  async function removeMember(member: Member) {
    const self = member.userId === me?.id;
    if (!confirm(self ? "Покинуть кампанию?" : `Исключить ${member.displayName}?`)) return;
    try {
      await api(`${base}/members/${member.id}`, { method: "DELETE" });
      if (self) router.push("/campaigns");
      else mutate();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  function copy(text: string, message: string) {
    navigator.clipboard?.writeText(text).then(
      () => toast(message, "success"),
      () => toast(text),
    );
  }

  /** Native share sheet on phones (Telegram, WhatsApp…), clipboard elsewhere. */
  async function shareInvite(code: string, name: string) {
    const url = inviteLink(code);
    if (navigator.share) {
      try {
        await navigator.share({ title: `Shadowrun: ${name}`, text: `Присоединяйся к кампании «${name}»`, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    copy(url, "Ссылка скопирована");
  }

  async function regenerateCode() {
    if (!confirm("Старые ссылки и код перестанут работать. Продолжить?")) return;
    try {
      const updated = await api<Campaign>(`${base}/invite-code`, { method: "POST" });
      mutateCampaign(updated, { revalidate: false });
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <section className="lg:col-span-2">
        <h2 className="mb-4 text-xl">Команда</h2>
        <div className="panel cut-corners divide-y divide-line">
          {members?.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-3 p-4">
              {m.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.avatarUrl} alt="" className="h-10 w-10 border border-line-hi" />
              ) : (
                <span className="grid h-10 w-10 place-items-center border border-line-hi bg-panel-2 font-display text-accent">{m.displayName.slice(0, 1)}</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {m.displayName} {m.userId === me?.id && <span className="text-xs text-slate-500">(вы)</span>}
                </p>
                <p className="font-mono text-[11px] text-muted">с {new Date(m.joinedAt).toLocaleDateString("ru-RU")}</p>
              </div>
              {isOwner ? (
                <select value={m.role} onChange={(e) => changeRole(m, e.target.value as CampaignRole)} className="input w-full sm:w-36">
                  {(Object.keys(ROLE_LABELS) as CampaignRole[]).map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              ) : (
                <span className="chip">{ROLE_LABELS[m.role]}</span>
              )}
              {(isOwner || m.userId === me?.id) && (
                <button onClick={() => removeMember(m)} className="min-h-11 font-mono text-[11px] uppercase text-muted hover:text-red-300">
                  {m.userId === me?.id ? "Покинуть" : "Исключить"}
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1 text-sm text-slate-400">
          <p><b className="text-slate-200">Владелец</b> — управляет участниками и ролями, может всё, что и мастер.</p>
          <p><b className="text-slate-200">Мастер</b> — карты, метки (в т.ч. скрытые), тайные заметки, логи игр.</p>
          <p><b className="text-slate-200">Игрок</b> — видит открытые метки, ведёт личные заметки и лист персонажа.</p>
        </div>
      </section>

      <aside className="space-y-6">
        {campaign?.inviteCode && (
          <div className="panel cut-corners hud-brackets p-5">
            <h3 className="label">Приглашение игроков</h3>
            <code className="glow block bg-bg/60 px-3 py-2 text-center font-mono text-lg tracking-[0.25em] text-accent">{campaign.inviteCode}</code>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="btn-primary" onClick={() => shareInvite(campaign.inviteCode!, campaign.name)}>
                Поделиться
              </button>
              <button className="btn-ghost" onClick={() => copy(inviteLink(campaign.inviteCode!), "Ссылка скопирована")}>
                Ссылка
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">
              Отправьте игрокам ссылку: они зарегистрируются и сразу попадут в кампанию как игроки. Код можно ввести и
              вручную на странице кампаний («По коду»).
            </p>
            {isOwner && <button onClick={regenerateCode} className="mt-2 min-h-11 font-mono text-[11px] uppercase text-muted hover:text-accent">Сгенерировать новый код</button>}
          </div>
        )}
        {isOwner && campaign && <CampaignSettings campaign={campaign} />}
      </aside>

      {isMaster && (
        <section className="lg:col-span-3">
          <MarkerTypeCatalogue base={base} />
        </section>
      )}
    </div>
  );
}

function CampaignSettings({ campaign }: { campaign: Campaign }) {
  const router = useRouter();
  const toast = useToast();
  const { mutate } = useCampaign();

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const updated = await api<Campaign>(`/campaigns/${campaign.id}`, {
        method: "PUT",
        json: { name: form.get("name"), description: form.get("description") },
      });
      mutate(updated, { revalidate: false });
      toast("Сохранено", "success");
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  async function remove() {
    const answer = prompt(`Это удалит кампанию, карты, метки, персонажей и логи. Введите название «${campaign.name}» для подтверждения:`);
    if (answer !== campaign.name) return;
    try {
      await api(`/campaigns/${campaign.id}`, { method: "DELETE" });
      router.push("/campaigns");
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  return (
    <form onSubmit={save} className="panel cut-corners space-y-3 p-5">
      <h3 className="label">Настройки кампании</h3>
      <input name="name" required maxLength={120} defaultValue={campaign.name} className="input" />
      <textarea name="description" rows={3} maxLength={5000} defaultValue={campaign.description ?? ""} className="input" />
      <div className="flex gap-2">
        <button className="btn-primary flex-1">Сохранить</button>
        <button type="button" onClick={remove} className="btn-danger">Удалить</button>
      </div>
    </form>
  );
}

function MarkerTypeCatalogue({ base }: { base: string }) {
  const toast = useToast();
  const url = `${base}/marker-types`;
  const { data: types, mutate } = useSWR<MarkerType[]>(url, fetcher);
  const [editing, setEditing] = useState<MarkerType | "new" | null>(null);

  const builtIn = types?.filter((t) => t.builtIn) ?? [];
  const custom = types?.filter((t) => !t.builtIn) ?? [];

  async function remove(t: MarkerType) {
    if (!confirm(`Удалить тип «${t.name}»?`)) return;
    try {
      await api(`${url}/${t.id}`, { method: "DELETE" });
      mutate();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl">Каталог меток</h2>
          <p className="text-sm text-muted">Уникальные формы и цвета для разных типов локаций. Добавьте свои типы для этой кампании.</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing("new")}>+ Свой тип</button>
      </div>
      {custom.length > 0 && (
        <>
          <h3 className="label">Типы кампании</h3>
          <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {custom.map((t) => (
              <div key={t.id} className="panel cut-corners-sm flex items-center gap-2 p-2 pl-3">
                <MarkerGlyph shape={t.shape} color={t.color} icon={t.icon} size={30} />
                <span className="flex-1 truncate text-sm">{t.name}</span>
                <button className="grid h-11 w-11 place-items-center text-muted hover:text-accent" onClick={() => setEditing(t)} aria-label="Изменить">✎</button>
                <button className="grid h-11 w-11 place-items-center text-muted hover:text-red-300" onClick={() => remove(t)} aria-label="Удалить">✕</button>
              </div>
            ))}
          </div>
        </>
      )}
      <h3 className="label">Встроенные</h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {builtIn.map((t) => (
          <div key={t.id} className="flex items-center gap-3 border border-line/60 p-3">
            <MarkerGlyph shape={t.shape} color={t.color} icon={t.icon} size={30} />
            <span className="truncate text-sm text-slate-300">{t.name}</span>
          </div>
        ))}
      </div>
      {editing && (
        <MarkerTypeDialog
          url={url}
          type={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            mutate();
          }}
        />
      )}
    </div>
  );
}

function MarkerTypeDialog({ url, type, onClose, onSaved }: { url: string; type: MarkerType | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(type?.name ?? "");
  const [shape, setShape] = useState<MarkerShape>(type?.shape ?? "CIRCLE");
  const [color, setColor] = useState(type?.color ?? "#22D3EE");
  const [icon, setIcon] = useState(type?.icon ?? "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api(type ? `${url}/${type.id}` : url, { method: type ? "PUT" : "POST", json: { name, shape, color, icon } });
      onSaved();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  }

  return (
    <Modal title={type ? "Тип метки" : "Новый тип метки"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex justify-center py-2">
          <MarkerGlyph shape={shape} color={color} icon={icon} size={64} />
        </div>
        <label className="block">
          <span className="label">Название</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} className="input" placeholder="Логово дракона" />
        </label>
        <div>
          <span className="label">Форма</span>
          <div className="grid grid-cols-4 gap-2">
            {SHAPES.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setShape(s)}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 border p-2 text-[11px] ${s === shape ? "border-accent bg-accent/10" : "border-line hover:border-line-hi"}`}
              >
                <MarkerGlyph shape={s} color={color} size={26} />
                {SHAPE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">Цвет</span>
            <div className="flex gap-2">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value.toUpperCase())} className="h-11 w-12 shrink-0 cursor-pointer border border-line bg-transparent" />
              <input value={color} onChange={(e) => setColor(e.target.value)} pattern="^#[0-9A-Fa-f]{6}$" className="input font-mono" />
            </div>
          </label>
          <label className="block">
            <span className="label">Значок (эмодзи)</span>
            <input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={16} className="input text-center text-lg" placeholder="🐉" />
          </label>
        </div>
        <button className="btn-primary w-full">Сохранить</button>
      </form>
    </Modal>
  );
}
