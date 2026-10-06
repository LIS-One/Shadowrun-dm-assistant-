"use client";

import { useRef, useState } from "react";
import { DiceTray, type RollRequest } from "./DiceRoller";
import { ListEditor } from "./ListEditor";
import {
  ATTRIBUTE_LABELS,
  ATTRIBUTES,
  derive,
  METATYPES,
  ROLES,
  type AttributeKey,
  type Quality,
  type Sheet,
  type Skill,
} from "./sheet";

const TABS = [
  { id: "main", label: "Основное" },
  { id: "skills", label: "Навыки и качества" },
  { id: "combat", label: "Бой и снаряжение" },
  { id: "magic", label: "Магия · Матрица · Кибер" },
  { id: "social", label: "Контакты и биография" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const ATTRIBUTE_OPTIONS = ATTRIBUTES.map((a) => ({ value: a, label: a }));

export function CharacterSheet({ sheet, onChange, readOnly }: { sheet: Sheet; onChange: (s: Sheet) => void; readOnly: boolean }) {
  const [tab, setTab] = useState<TabId>("main");
  const [roll, setRoll] = useState<{ key: number; request: RollRequest } | null>(null);
  const d = derive(sheet);
  const set = <K extends keyof Sheet>(key: K, value: Sheet[K]) => onChange({ ...sheet, [key]: value });
  const setAttr = (key: AttributeKey, value: number) => set("attributes", { ...sheet.attributes, [key]: value });
  const rollSeq = useRef(0);
  const rollDice = (label: string, pool: number) => {
    rollSeq.current += 1;
    setRoll({ key: rollSeq.current, request: { label, pool: Math.max(0, pool + d.woundModifier) } });
  };

  return (
    <div>
      <nav className="scrollbar-thin mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${tab === t.id ? "border-accent text-white" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            {t.label}
          </button>
        ))}
        <button onClick={() => rollDice("Свободный бросок", 6 - d.woundModifier)} className="ml-auto whitespace-nowrap px-3 py-2 text-sm text-accent">
          🎲 Кубики
        </button>
      </nav>

      {tab === "main" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Section title="Персонаж" className="lg:col-span-1">
            <div className="grid gap-3">
              <Field label="Редакция">
                <select value={sheet.edition} disabled={readOnly} onChange={(e) => set("edition", e.target.value as Sheet["edition"])} className="input">
                  <option value="SR5">Shadowrun 5e</option>
                  <option value="SR6">Shadowrun 6e</option>
                </select>
              </Field>
              <Field label="Метатип">
                <input list="metatypes" value={sheet.metatype} readOnly={readOnly} onChange={(e) => set("metatype", e.target.value)} className="input" />
                <datalist id="metatypes">{METATYPES.map((m) => <option key={m} value={m} />)}</datalist>
              </Field>
              <Field label="Роль / архетип">
                <input list="roles" value={sheet.role} readOnly={readOnly} onChange={(e) => set("role", e.target.value)} className="input" />
                <datalist id="roles">{ROLES.map((m) => <option key={m} value={m} />)}</datalist>
              </Field>
              <Field label="Настоящее имя">
                <input value={sheet.realName} readOnly={readOnly} onChange={(e) => set("realName", e.target.value)} className="input" />
              </Field>
              <Field label="Концепт">
                <input value={sheet.concept} readOnly={readOnly} onChange={(e) => set("concept", e.target.value)} className="input" placeholder="Бывший корп-секьюрити в бегах" />
              </Field>
            </div>
          </Section>

          <Section title="Атрибуты" className="lg:col-span-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ATTRIBUTES.map((key) => (
                <div key={key} className="rounded-xl border border-line bg-bg/50 p-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-sm font-bold text-accent">{key}</span>
                    <button onClick={() => rollDice(`${ATTRIBUTE_LABELS[key]} ×2`, sheet.attributes[key] * 2)} className="text-xs text-slate-500 hover:text-accent" title="Бросок атрибут ×2">🎲</button>
                  </div>
                  <p className="truncate text-[11px] text-slate-500">{ATTRIBUTE_LABELS[key]}</p>
                  <NumberInput value={sheet.attributes[key]} min={0} max={15} readOnly={readOnly} onChange={(v) => setAttr(key, v)} className="mt-1 text-center text-xl font-semibold" />
                </div>
              ))}
              <div className="rounded-xl border border-line bg-bg/50 p-2.5">
                <span className="font-mono text-sm font-bold text-accent-2">ESS</span>
                <p className="truncate text-[11px] text-slate-500">Сущность (6 − импланты)</p>
                <p className="mt-1 text-center text-xl font-semibold">{d.essence}</p>
              </div>
            </div>
          </Section>

          <Section title="Состояние" className="lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <Monitor label="Физический монитор" max={d.physicalMonitor} value={sheet.damage.physical} color="bg-red-500" readOnly={readOnly}
                onChange={(v) => set("damage", { ...sheet.damage, physical: v })} />
              <Monitor label="Монитор оглушения" max={d.stunMonitor} value={sheet.damage.stun} color="bg-amber-400" readOnly={readOnly}
                onChange={(v) => set("damage", { ...sheet.damage, stun: v })} />
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Переполнение: {d.overflow} · Модификатор ранений: <span className={d.woundModifier < 0 ? "text-red-300" : ""}>{d.woundModifier}</span>
              {d.woundModifier < 0 && " (учитывается в бросках)"}
            </p>
          </Section>

          <Section title="Производные">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <Stat label="Инициатива" value={d.initiative} />
              <Stat label="Астральная" value={d.astralInitiative} />
              <Stat label="Матрица (cold/hot)" value={d.matrixInitiative} />
              <Stat label="Броня" value={d.armor} />
              {d.limits && (
                <>
                  <Stat label="Лимит физ." value={d.limits.physical} />
                  <Stat label="Лимит мент." value={d.limits.mental} />
                  <Stat label="Лимит соц." value={d.limits.social} />
                </>
              )}
              {d.defenseRating !== null && <Stat label="Рейтинг защиты" value={d.defenseRating} />}
              <Stat label="Самообладание" value={d.composure} />
              <Stat label="Оценка намерений" value={d.judgeIntentions} />
              <Stat label="Память" value={d.memory} />
              <Stat label="Подъём/перенос" value={d.liftCarry} />
            </dl>
          </Section>

          <Section title="Ресурсы" className="lg:col-span-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              <Field label="Грань (тек.)"><NumberInput value={sheet.edgeCurrent} min={0} max={sheet.attributes.EDG} readOnly={readOnly} onChange={(v) => set("edgeCurrent", v)} /></Field>
              <Field label="Карма"><NumberInput value={sheet.karma} readOnly={readOnly} onChange={(v) => set("karma", v)} /></Field>
              <Field label="Всего кармы"><NumberInput value={sheet.totalKarma} readOnly={readOnly} onChange={(v) => set("totalKarma", v)} /></Field>
              <Field label="Нюйены ¥"><NumberInput value={sheet.nuyen} readOnly={readOnly} onChange={(v) => set("nuyen", v)} /></Field>
              <Field label="Уличная репутация"><NumberInput value={sheet.streetCred} readOnly={readOnly} onChange={(v) => set("streetCred", v)} /></Field>
              <Field label="Дурная слава"><NumberInput value={sheet.notoriety} readOnly={readOnly} onChange={(v) => set("notoriety", v)} /></Field>
              <Field label="Образ жизни"><input value={sheet.lifestyle} readOnly={readOnly} onChange={(e) => set("lifestyle", e.target.value)} className="input" /></Field>
              <Field label="СИНы"><input value={sheet.sins} readOnly={readOnly} onChange={(e) => set("sins", e.target.value)} className="input" placeholder="Фальшивый СИН (4)" /></Field>
            </div>
          </Section>
        </div>
      )}

      {tab === "skills" && (
        <div className="grid gap-5">
          <Section title="Навыки">
            <ListEditor<Skill>
              items={sheet.skills}
              onChange={(v) => set("skills", v)}
              readOnly={readOnly}
              create={() => ({ name: "", attribute: "AGI", rating: 1, specialization: "" })}
              columns={[
                { key: "name", label: "Навык", placeholder: "Огнестрельное оружие" },
                { key: "attribute", label: "Атрибут", type: "select", options: ATTRIBUTE_OPTIONS, className: "w-24" },
                { key: "rating", label: "Ранг", type: "number", className: "w-20" },
                { key: "specialization", label: "Специализация", placeholder: "Пистолеты" },
              ]}
              extra={(s) => {
                const pool = (Number(s.rating) || 0) + (sheet.attributes[s.attribute] ?? 0);
                return (
                  <button onClick={() => rollDice(s.name || "Навык", pool)} className="whitespace-nowrap rounded-md border border-accent/40 px-2 py-0.5 font-mono text-xs text-accent hover:bg-accent/10" title="Пул: ранг + атрибут">
                    🎲 {pool}
                  </button>
                );
              }}
              emptyText="Навыков пока нет"
            />
            <p className="mt-2 text-xs text-slate-500">Пул = ранг + атрибут. Специализация даёт +2 (SR5) или +2/+3 (SR6) к соответствующему броску.</p>
          </Section>
          <Section title="Качества">
            <ListEditor<Quality>
              items={sheet.qualities}
              onChange={(v) => set("qualities", v)}
              readOnly={readOnly}
              create={() => ({ name: "", kind: "positive", karma: 0, notes: "" })}
              columns={[
                { key: "name", label: "Качество" },
                { key: "kind", label: "Тип", type: "select", options: [{ value: "positive", label: "Позитивное" }, { value: "negative", label: "Негативное" }], className: "w-36" },
                { key: "karma", label: "Карма", type: "number", className: "w-20" },
                { key: "notes", label: "Заметки" },
              ]}
            />
          </Section>
        </div>
      )}

      {tab === "combat" && (
        <div className="grid gap-5">
          <Section title="Оружие">
            <ListEditor
              items={sheet.weapons}
              onChange={(v) => set("weapons", v)}
              readOnly={readOnly}
              create={() => ({ name: "", damage: "", ap: "", mode: "", accuracy: "", ammo: "", notes: "" })}
              columns={[
                { key: "name", label: "Оружие", placeholder: "Ares Predator VI" },
                { key: "damage", label: "Урон", className: "w-20", placeholder: "8P" },
                { key: "ap", label: "ПБ/AR", className: "w-20", placeholder: "-1" },
                { key: "mode", label: "Режим", className: "w-20", placeholder: "SA" },
                { key: "accuracy", label: "Точн.", className: "w-16" },
                { key: "ammo", label: "Боезап.", className: "w-20", placeholder: "15(c)" },
                { key: "notes", label: "Заметки" },
              ]}
            />
          </Section>
          <Section title="Броня">
            <ListEditor
              items={sheet.armor}
              onChange={(v) => set("armor", v)}
              readOnly={readOnly}
              create={() => ({ name: "", rating: 0, equipped: true })}
              columns={[
                { key: "equipped", label: "Надета", type: "checkbox", className: "w-16" },
                { key: "name", label: "Броня", placeholder: "Бронекуртка" },
                { key: "rating", label: "Рейтинг", type: "number", className: "w-24" },
              ]}
            />
            <p className="mt-2 text-xs text-slate-500">Суммарная броня надетых предметов: {d.armor}</p>
          </Section>
          <Section title="Снаряжение">
            <ListEditor
              items={sheet.gear}
              onChange={(v) => set("gear", v)}
              readOnly={readOnly}
              create={() => ({ name: "", qty: 1, notes: "" })}
              columns={[
                { key: "name", label: "Предмет" },
                { key: "qty", label: "Кол-во", type: "number", className: "w-24" },
                { key: "notes", label: "Заметки" },
              ]}
            />
          </Section>
        </div>
      )}

      {tab === "magic" && (
        <div className="grid gap-5">
          <Section title="Заклинания, силы, комплексные формы">
            <ListEditor
              items={sheet.magic}
              onChange={(v) => set("magic", v)}
              readOnly={readOnly}
              create={() => ({ name: "", kind: "", drain: "", notes: "" })}
              columns={[
                { key: "name", label: "Название", placeholder: "Огненный шар" },
                { key: "kind", label: "Тип", className: "w-36", placeholder: "Боевое" },
                { key: "drain", label: "Истощение", className: "w-28", placeholder: "F-1" },
                { key: "notes", label: "Заметки" },
              ]}
            />
          </Section>
          <Section title="Импланты (кибер/биоварь)">
            <ListEditor
              items={sheet.augmentations}
              onChange={(v) => set("augmentations", v)}
              readOnly={readOnly}
              create={() => ({ name: "", grade: "Стандарт", rating: 1, essence: 0, notes: "" })}
              columns={[
                { key: "name", label: "Имплант", placeholder: "Проводка рефлексов" },
                { key: "grade", label: "Класс", className: "w-28" },
                { key: "rating", label: "Рейтинг", type: "number", className: "w-20" },
                { key: "essence", label: "Сущн.", type: "number", className: "w-20" },
                { key: "notes", label: "Заметки" },
              ]}
            />
            <p className="mt-2 text-xs text-slate-500">Оставшаяся сущность: {d.essence}</p>
          </Section>
          <Section title="Матрица">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
              <Field label="Кибердека" className="col-span-2">
                <input value={sheet.matrix.deck} readOnly={readOnly} onChange={(e) => set("matrix", { ...sheet.matrix, deck: e.target.value })} className="input" />
              </Field>
              {(["deviceRating", "attack", "sleaze", "dataProcessing", "firewall"] as const).map((k) => (
                <Field key={k} label={{ deviceRating: "Рейтинг", attack: "Атака", sleaze: "Скрытность", dataProcessing: "Обработка", firewall: "Файрвол" }[k]}>
                  <NumberInput value={sheet.matrix[k]} min={0} max={15} readOnly={readOnly} onChange={(v) => set("matrix", { ...sheet.matrix, [k]: v })} />
                </Field>
              ))}
            </div>
          </Section>
        </div>
      )}

      {tab === "social" && (
        <div className="grid gap-5">
          <Section title="Контакты">
            <ListEditor
              items={sheet.contacts}
              onChange={(v) => set("contacts", v)}
              readOnly={readOnly}
              create={() => ({ name: "", connection: 1, loyalty: 1, notes: "" })}
              columns={[
                { key: "name", label: "Контакт", placeholder: "Фиксер «Рыжий»" },
                { key: "connection", label: "Связи", type: "number", className: "w-20" },
                { key: "loyalty", label: "Лояльн.", type: "number", className: "w-20" },
                { key: "notes", label: "Заметки" },
              ]}
            />
          </Section>
          <Section title="Биография">
            <textarea
              value={sheet.background}
              readOnly={readOnly}
              onChange={(e) => set("background", e.target.value)}
              rows={10}
              className="input"
              placeholder="Откуда персонаж, что им движет, кто охотится за ним…"
            />
          </Section>
        </div>
      )}

      {roll && <DiceTray key={roll.key} request={roll.request} onClose={() => setRoll(null)} />}
    </div>
  );
}

function Section({ title, className = "", children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`panel p-4 ${className}`}>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className="font-mono text-base text-slate-100">{value}</dd>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  readOnly,
  min,
  max,
  className = "",
}: {
  value: number;
  onChange: (v: number) => void;
  readOnly: boolean;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      className={`input ${className}`}
    />
  );
}

/** Clickable damage track: click a box to set damage up to it, click the last filled box to heal one. */
function Monitor({
  label,
  max,
  value,
  color,
  onChange,
  readOnly,
}: {
  label: string;
  max: number;
  value: number;
  color: string;
  onChange: (v: number) => void;
  readOnly: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono text-slate-400">{Math.min(value, max)}/{max}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: max }, (_, i) => {
          const filled = i < value;
          return (
            <button
              key={i}
              disabled={readOnly}
              onClick={() => onChange(value === i + 1 ? i : i + 1)}
              className={`h-6 w-6 rounded border text-[9px] transition ${filled ? `${color} border-transparent text-slate-950` : "border-line bg-bg/60 hover:border-slate-500"} ${(i + 1) % 3 === 0 ? "mr-1.5" : ""}`}
              aria-label={`${label}: ${i + 1}`}
            >
              {(i + 1) % 3 === 0 ? `-${(i + 1) / 3}` : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
