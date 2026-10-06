"use client";

import { useRef, useState } from "react";
import { DiceTray, type RollRequest } from "./DiceRoller";
import { ListEditor } from "./ListEditor";
import {
  ATTRIBUTE_LABELS,
  ATTRIBUTES,
  AUGMENTABLE,
  augmentedMax,
  derive,
  findSkill,
  karmaCost,
  KNOWLEDGE_CATEGORIES,
  knowledgeAttribute,
  LIFESTYLES,
  METATYPE_NAMES,
  METATYPES,
  range,
  ROLES,
  skillPool,
  TRADITIONS,
  type AdeptPower,
  type ArmorItem,
  type AttributeKey,
  type Augmentation,
  type Contact,
  type GearItem,
  type KnowledgeSkill,
  type Metatype,
  type Program,
  type Quality,
  type Sheet,
  type Skill,
  type Spell,
  type Vehicle,
  type Weapon,
} from "./sheet";

const TABS = [
  { id: "main", label: "Основное" },
  { id: "skills", label: "Навыки" },
  { id: "combat", label: "Бой" },
  { id: "magic", label: "Магия · Матрица" },
  { id: "social", label: "Связи" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const ATTRIBUTE_OPTIONS = ATTRIBUTES.map((a) => ({ value: a, label: a }));
const QUALITY_LIMIT_BP = 35;

/** Shadowrun 20th Anniversary Edition (SR4A) character sheet. */
export function CharacterSheet({ sheet, onChange, readOnly }: { sheet: Sheet; onChange: (s: Sheet) => void; readOnly: boolean }) {
  const [tab, setTab] = useState<TabId>("main");
  const [roll, setRoll] = useState<{ key: number; request: RollRequest } | null>(null);
  const rollSeq = useRef(0);
  const d = derive(sheet);
  const set = <K extends keyof Sheet>(key: K, value: Sheet[K]) => onChange({ ...sheet, [key]: value });

  /** Opens the dice tray. Wound modifiers apply to every test except damage resistance. */
  const rollDice = (label: string, pool: number, opts: { wounds?: boolean; base?: number; note?: string } = {}) => {
    const wounds = opts.wounds ?? true;
    rollSeq.current += 1;
    setRoll({
      key: rollSeq.current,
      request: {
        label,
        pool: Math.max(0, pool + (wounds ? d.woundModifier : 0)),
        base: opts.base,
        note: [opts.note, wounds && d.woundModifier < 0 ? `учтён модификатор ранений ${d.woundModifier}` : null].filter(Boolean).join(" · ") || undefined,
      },
    });
  };

  const skillNames = sheet.skills.filter((s) => s.name.trim()).map((s) => ({ value: s.name, label: s.name }));
  const spellcasting = findSkill(sheet, /колдовств|spellcast/i);
  const spellPool = (spellcasting ? Number(spellcasting.rating) || 0 : 0) + d.attr.MAG;

  return (
    <div>
      <nav className="scrollbar-thin sticky top-[calc(3.5rem+var(--safe-top))] z-30 -mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-line bg-bg/90 px-4 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-11 whitespace-nowrap border-b-2 px-3 font-mono text-xs uppercase tracking-wider ${
              tab === t.id ? "border-accent text-accent" : "border-transparent text-muted hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
        <button onClick={() => rollDice("Свободный бросок", 6, { wounds: false })} className="ml-auto min-h-11 whitespace-nowrap px-3 font-mono text-xs uppercase text-accent-2">
          🎲 Кубики
        </button>
      </nav>

      {tab === "main" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Section title="Персонаж">
            <div className="grid gap-3">
              <Field label="Метатип">
                <select
                  value={sheet.metatype}
                  disabled={readOnly}
                  onChange={(e) => set("metatype", e.target.value as Metatype)}
                  className="input"
                >
                  {METATYPE_NAMES.map((m) => <option key={m}>{m}</option>)}
                </select>
                <p className="mt-1 text-xs text-muted">{METATYPES[sheet.metatype].traits}</p>
              </Field>
              <Field label="Архетип">
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

          <Section title="Атрибуты" className="lg:col-span-2" hint="естественный (аугментированный)">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {AUGMENTABLE.map((key) => (
                <AttributeCard
                  key={key}
                  attribute={key}
                  sheet={sheet}
                  augmented={d.attr[key]}
                  readOnly={readOnly}
                  onNatural={(v) => set("attributes", { ...sheet.attributes, [key]: v })}
                  onAugment={(v) => set("augments", { ...sheet.augments, [key]: v })}
                />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["EDG", "MAG", "RES"] as const).map((key) => (
                <AttributeCard
                  key={key}
                  attribute={key}
                  sheet={sheet}
                  augmented={d.attr[key]}
                  readOnly={readOnly}
                  onNatural={(v) => set("attributes", { ...sheet.attributes, [key]: v })}
                />
              ))}
              <div className="cut-corners-sm border border-line bg-bg/50 p-2.5">
                <span className="font-mono text-sm font-bold text-accent-2">ESS</span>
                <p className="truncate text-[11px] text-muted">Сущность</p>
                <p className="mt-1 text-center font-display text-2xl">{d.essence}</p>
                {d.magicLoss > 0 && (sheet.attributes.MAG > 0 || sheet.attributes.RES > 0) && (
                  <p className="mt-1 text-[11px] text-warn">Макс. Магии/Резонанса −{d.magicLoss}</p>
                )}
              </div>
            </div>
            <div className="mt-4">
              <span className="label">Очки Грани</span>
              <Pips
                total={sheet.attributes.EDG}
                value={sheet.edgeCurrent}
                readOnly={readOnly}
                onChange={(v) => set("edgeCurrent", v)}
                color="bg-accent-2"
              />
            </div>
          </Section>

          <Section title="Состояние" className="lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <Monitor label="Физический урон" max={d.physicalMonitor} value={sheet.damage.physical} color="bg-danger" readOnly={readOnly}
                onChange={(v) => set("damage", { ...sheet.damage, physical: v })} />
              <Monitor label="Оглушение" max={d.stunMonitor} value={sheet.damage.stun} color="bg-warn" readOnly={readOnly}
                onChange={(v) => set("damage", { ...sheet.damage, stun: v })} />
            </div>
            <p className="mt-3 font-mono text-xs text-muted">
              Переполнение: {d.overflow} · Модификатор ранений:{" "}
              <span className={d.woundModifier < 0 ? "text-red-300" : ""}>{d.woundModifier}</span>
            </p>
          </Section>

          <Section title="Инициатива">
            <div className="space-y-2">
              <RollRow
                label="Физическая"
                value={`${d.initiative} + ${d.initiative}к6`}
                sub={`проходов: ${d.initiativePasses}`}
                onRoll={() => rollDice("Инициатива", d.initiative, { base: d.initiative, note: `REA + INT, проходов: ${d.initiativePasses}` })}
              />
              <RollRow label="Астральная" value={`${d.astralInitiative}`} sub="INT × 2, проходов: 3" />
              <RollRow label="Матрица (VR)" value={`${d.matrixInitiative}`} sub="Отклик + INT, холодный 2 / горячий 3 прохода" />
              <Field label="Доп. проходы (импланты, заклинания)">
                <NumberInput value={sheet.extraPasses} min={0} max={3} readOnly={readOnly} onChange={(v) => set("extraPasses", v)} />
              </Field>
            </div>
          </Section>

          <Section title="Тесты" className="lg:col-span-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <RollRow label="Урон (баллист.)" value={`${d.attr.BOD + d.ballistic}`} sub={`BOD + броня ${d.ballistic}`}
                onRoll={() => rollDice("Сопротивление урону (баллист.)", d.attr.BOD + d.ballistic, { wounds: false, note: "BOD + баллистическая броня (с учётом ББ оружия вычтите вручную)" })} />
              <RollRow label="Урон (ударн.)" value={`${d.attr.BOD + d.impact}`} sub={`BOD + броня ${d.impact}`}
                onRoll={() => rollDice("Сопротивление урону (ударн.)", d.attr.BOD + d.impact, { wounds: false })} />
              <RollRow label="Уклонение" value={`${d.attr.REA}`} sub="REA (+ Уклонение при полной защите)"
                onRoll={() => rollDice("Защита от дальней атаки", d.attr.REA)} />
              {d.drainResist !== null && (
                <RollRow label={d.drainLabel!.split(":")[0]} value={`${d.drainResist}`} sub={d.drainLabel!.split(": ")[1]}
                  onRoll={() => rollDice(d.drainLabel!.split(":")[0], d.drainResist!, { wounds: false })} />
              )}
              <RollRow label="Самообладание" value={`${d.composure}`} sub="CHA + WIL" onRoll={() => rollDice("Самообладание", d.composure)} />
              <RollRow label="Оценка намерений" value={`${d.judgeIntentions}`} sub="CHA + INT" onRoll={() => rollDice("Оценка намерений", d.judgeIntentions)} />
              <RollRow label="Память" value={`${d.memory}`} sub="LOG + WIL" onRoll={() => rollDice("Память", d.memory)} />
              <RollRow label="Подъём / перенос" value={`${d.liftCarry}`} sub="BOD + STR" onRoll={() => rollDice("Подъём / перенос", d.liftCarry)} />
            </div>
          </Section>

          <Section title="Ресурсы" className="lg:col-span-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              <Field label="Карма"><NumberInput value={sheet.karma} readOnly={readOnly} onChange={(v) => set("karma", v)} /></Field>
              <Field label="Карма за карьеру"><NumberInput value={sheet.careerKarma} readOnly={readOnly} onChange={(v) => set("careerKarma", v)} /></Field>
              <Field label="Нюйены ¥"><NumberInput value={sheet.nuyen} readOnly={readOnly} onChange={(v) => set("nuyen", v)} /></Field>
              <Field label={`Уличный авторитет (≥${d.suggestedStreetCred})`}><NumberInput value={sheet.streetCred} readOnly={readOnly} onChange={(v) => set("streetCred", v)} /></Field>
              <Field label="Дурная слава"><NumberInput value={sheet.notoriety} readOnly={readOnly} onChange={(v) => set("notoriety", v)} /></Field>
              <Field label="Известность"><NumberInput value={sheet.publicAwareness} readOnly={readOnly} onChange={(v) => set("publicAwareness", v)} /></Field>
              <Field label={`Образ жизни · ${d.lifestyleCost.toLocaleString("ru-RU")}¥/мес`}>
                <select value={sheet.lifestyle} disabled={readOnly} onChange={(e) => set("lifestyle", e.target.value)} className="input">
                  {LIFESTYLES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </Field>
              <Field label="СИНы"><input value={sheet.sins} readOnly={readOnly} onChange={(e) => set("sins", e.target.value)} className="input" placeholder="Фальшивый СИН (4)" /></Field>
            </div>
          </Section>
        </div>
      )}

      {tab === "skills" && (
        <div className="grid gap-4">
          <Section title="Активные навыки" hint="пул = навык + атрибут; без навыка — атрибут − 1">
            <ListEditor<Skill>
              items={sheet.skills}
              onChange={(v) => set("skills", v)}
              readOnly={readOnly}
              create={() => ({ name: "", group: "", attribute: "AGI", rating: 1, specialization: "" })}
              columns={[
                { key: "name", label: "Навык", placeholder: "Пистолеты", wide: true },
                { key: "group", label: "Группа", placeholder: "Огнестрельное", className: "w-36" },
                { key: "attribute", label: "Атрибут", type: "select", options: ATTRIBUTE_OPTIONS, className: "w-24" },
                { key: "rating", label: "Ранг", type: "number", className: "w-20" },
                { key: "specialization", label: "Специализация (+2)", placeholder: "Полуавтоматы", className: "w-44" },
              ]}
              extra={(s) => {
                const pool = skillPool(s, d);
                return (
                  <PoolButton
                    pool={pool}
                    title={`↑ ${karmaCost.activeSkill((Number(s.rating) || 0) + 1)} кармы`}
                    onClick={() => rollDice(s.name || "Навык", pool, { note: s.specialization ? `со специализацией «${s.specialization}»: +2` : undefined })}
                  />
                );
              }}
              emptyText="Навыков пока нет"
            />
            <p className="mt-2 text-xs text-muted">
              Повышение навыка стоит новый ранг × 2 кармы (новый навык — 4), специализация — 2, атрибута — новый ранг × 5.
            </p>
          </Section>

          <Section title="Знания и языки" hint={`бесплатные очки при создании: ${d.usedKnowledgePoints} / ${d.freeKnowledgePoints}`}>
            <ListEditor<KnowledgeSkill>
              items={sheet.knowledge}
              onChange={(v) => set("knowledge", v)}
              readOnly={readOnly}
              create={() => ({ name: "", category: "street", rating: 1, specialization: "", native: false })}
              columns={[
                { key: "name", label: "Знание / язык", placeholder: "Банды Сиэтла", wide: true },
                { key: "category", label: "Тип", type: "select", options: KNOWLEDGE_CATEGORIES, className: "w-48" },
                { key: "rating", label: "Ранг", type: "number", className: "w-20" },
                { key: "specialization", label: "Специализация", className: "w-40" },
                { key: "native", label: "Родной", type: "checkbox", className: "w-16" },
              ]}
              extra={(k) => {
                const pool = (Number(k.rating) || 0) + d.attr[knowledgeAttribute(k.category)];
                return k.native ? <span className="font-mono text-xs text-muted">родной</span> : <PoolButton pool={pool} onClick={() => rollDice(k.name || "Знание", pool)} />;
              }}
            />
            {d.usedKnowledgePoints > d.freeKnowledgePoints && (
              <p className="mt-2 text-xs text-warn">Сверх бесплатных очков: 2 BP за пункт при создании.</p>
            )}
          </Section>

          <Section title="Качества" hint={`позитивные ${d.positiveBp} / ${QUALITY_LIMIT_BP} BP · негативные ${d.negativeBp} / ${QUALITY_LIMIT_BP} BP`}>
            <ListEditor<Quality>
              items={sheet.qualities}
              onChange={(v) => set("qualities", v)}
              readOnly={readOnly}
              create={() => ({ name: "", kind: "positive", bp: 5, notes: "" })}
              columns={[
                { key: "name", label: "Качество", placeholder: "Удачливый", wide: true },
                { key: "kind", label: "Тип", type: "select", options: [{ value: "positive", label: "Позитивное" }, { value: "negative", label: "Негативное" }], className: "w-36" },
                { key: "bp", label: "BP", type: "number", className: "w-20" },
                { key: "notes", label: "Заметки", wide: true },
              ]}
            />
            {(d.positiveBp > QUALITY_LIMIT_BP || d.negativeBp > QUALITY_LIMIT_BP) && (
              <p className="mt-2 text-xs text-warn">При создании персонажа лимит — {QUALITY_LIMIT_BP} BP позитивных и {QUALITY_LIMIT_BP} BP негативных качеств.</p>
            )}
          </Section>
        </div>
      )}

      {tab === "combat" && (
        <div className="grid gap-4">
          <Section title="Оружие">
            <ListEditor<Weapon>
              items={sheet.weapons}
              onChange={(v) => set("weapons", v)}
              readOnly={readOnly}
              create={() => ({ name: "", skill: skillNames[0]?.value ?? "", damage: "", ap: "", mode: "", rc: "", ammo: "", reach: "", notes: "" })}
              columns={[
                { key: "name", label: "Оружие", placeholder: "Ares Predator IV", wide: true },
                { key: "skill", label: "Навык", type: "select", options: [{ value: "", label: "—" }, ...skillNames], className: "w-36" },
                { key: "damage", label: "Урон", className: "w-16", placeholder: "5P" },
                { key: "ap", label: "ББ", className: "w-14", placeholder: "-1" },
                { key: "mode", label: "Режим", className: "w-20", placeholder: "SA" },
                { key: "rc", label: "Отдача", className: "w-16", placeholder: "0" },
                { key: "ammo", label: "Боезап.", className: "w-20", placeholder: "15(c)" },
                { key: "reach", label: "Досяг.", className: "w-16" },
              ]}
              extra={(w) => {
                const skill = sheet.skills.find((s) => s.name === w.skill);
                if (!skill) return null;
                const pool = skillPool(skill, d);
                return <PoolButton pool={pool} onClick={() => rollDice(`Атака: ${w.name || skill.name}`, pool, { note: `${w.damage} ББ ${w.ap || 0}` })} />;
              }}
            />
          </Section>
          <Section title="Броня" hint={`баллистическая ${d.ballistic} / ударная ${d.impact}`}>
            <ListEditor<ArmorItem>
              items={sheet.armor}
              onChange={(v) => set("armor", v)}
              readOnly={readOnly}
              create={() => ({ name: "", ballistic: 0, impact: 0, stacks: false, equipped: true })}
              columns={[
                { key: "equipped", label: "Надета", type: "checkbox", className: "w-16" },
                { key: "name", label: "Броня", placeholder: "Бронекуртка", wide: true },
                { key: "ballistic", label: "Баллист.", type: "number", className: "w-24" },
                { key: "impact", label: "Ударная", type: "number", className: "w-24" },
                { key: "stacks", label: "Добавочная", type: "checkbox", className: "w-24" },
              ]}
            />
            <p className="mt-2 text-xs text-muted">
              Учитывается лучшая надетая броня плюс добавочные предметы (шлем, щит, облегающая броня)
              {METATYPES[sheet.metatype].naturalArmor > 0 && ` и +${METATYPES[sheet.metatype].naturalArmor} от метатипа`}.
            </p>
            {d.armorExcess > 0 && (
              <p className="mt-1 text-xs text-warn">
                Броня превышает Телосложение × 2 на {d.armorExcess}: −1 к Ловкости и Реакции за каждые 2 полных пункта превышения.
              </p>
            )}
          </Section>
          <Section title="Снаряжение">
            <ListEditor<GearItem>
              items={sheet.gear}
              onChange={(v) => set("gear", v)}
              readOnly={readOnly}
              create={() => ({ name: "", qty: 1, notes: "" })}
              columns={[
                { key: "name", label: "Предмет", wide: true },
                { key: "qty", label: "Кол-во", type: "number", className: "w-24" },
                { key: "notes", label: "Заметки" },
              ]}
            />
          </Section>
          <Section title="Транспорт и дроны">
            <ListEditor<Vehicle>
              items={sheet.vehicles}
              onChange={(v) => set("vehicles", v)}
              readOnly={readOnly}
              create={() => ({ name: "", handling: "", accel: "", speed: "", pilot: 1, body: 1, armor: 0, sensor: 1 })}
              columns={[
                { key: "name", label: "Название", placeholder: "Harley-Davidson Scorpion", wide: true },
                { key: "handling", label: "Управл.", className: "w-16" },
                { key: "accel", label: "Ускор.", className: "w-20" },
                { key: "speed", label: "Скорость", className: "w-20" },
                { key: "pilot", label: "Пилот", type: "number", className: "w-16" },
                { key: "body", label: "Корпус", type: "number", className: "w-16" },
                { key: "armor", label: "Броня", type: "number", className: "w-16" },
                { key: "sensor", label: "Сенсор", type: "number", className: "w-16" },
              ]}
            />
          </Section>
        </div>
      )}

      {tab === "magic" && (
        <div className="grid gap-4">
          <Section title="Традиция">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Традиция">
                <select value={sheet.tradition} disabled={readOnly} onChange={(e) => set("tradition", e.target.value as Sheet["tradition"])} className="input">
                  {TRADITIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                {d.drainResist !== null && <RollRow label={d.drainLabel!.split(":")[0]} value={`${d.drainResist}`} sub={d.drainLabel!.split(": ")[1]} onRoll={() => rollDice(d.drainLabel!.split(":")[0], d.drainResist!, { wounds: false })} />}
                {sheet.attributes.MAG > 0 && (
                  <RollRow label="Колдовство" value={`${spellPool}`} sub={spellcasting ? "навык + MAG" : "нет навыка «Колдовство»"} onRoll={() => rollDice("Колдовство", spellPool)} />
                )}
              </div>
            </div>
          </Section>
          <Section title="Заклинания">
            <ListEditor<Spell>
              items={sheet.spells}
              onChange={(v) => set("spells", v)}
              readOnly={readOnly}
              create={() => ({ name: "", category: "Боевое", type: "М", range: "LOS", damage: "", duration: "I", drain: "(F/2)" })}
              columns={[
                { key: "name", label: "Заклинание", placeholder: "Взрыв маны", wide: true },
                { key: "category", label: "Категория", className: "w-28" },
                { key: "type", label: "Тип", className: "w-14", placeholder: "Ф/М" },
                { key: "range", label: "Дальность", className: "w-24", placeholder: "LOS(A)" },
                { key: "damage", label: "Урон", className: "w-16", placeholder: "P" },
                { key: "duration", label: "Длит.", className: "w-16", placeholder: "I/S/P" },
                { key: "drain", label: "Истощение", className: "w-28", placeholder: "(F/2)+1" },
              ]}
            />
          </Section>
          <Section title="Силы адепта" hint={`очки сил: ${d.powerPointsUsed} / ${sheet.attributes.MAG}`}>
            <ListEditor<AdeptPower>
              items={sheet.powers}
              onChange={(v) => set("powers", v)}
              readOnly={readOnly}
              create={() => ({ name: "", level: 1, cost: 0.25, notes: "" })}
              columns={[
                { key: "name", label: "Сила", placeholder: "Улучшенные рефлексы", wide: true },
                { key: "level", label: "Уровень", type: "number", className: "w-20" },
                { key: "cost", label: "Стоимость", type: "number", className: "w-24" },
                { key: "notes", label: "Заметки" },
              ]}
            />
          </Section>
          <Section title="Импланты" hint={`сущность ${d.essence}`}>
            <ListEditor<Augmentation>
              items={sheet.augmentations}
              onChange={(v) => set("augmentations", v)}
              readOnly={readOnly}
              create={() => ({ name: "", grade: "Стандарт", rating: 1, essence: 0, notes: "" })}
              columns={[
                { key: "name", label: "Имплант", placeholder: "Проводка рефлексов", wide: true },
                { key: "grade", label: "Класс", type: "select", options: ["Стандарт", "Б/у", "Альфа", "Бета", "Дельта"].map((g) => ({ value: g, label: g })), className: "w-28" },
                { key: "rating", label: "Рейтинг", type: "number", className: "w-20" },
                { key: "essence", label: "Сущн.", type: "number", className: "w-20" },
                { key: "notes", label: "Заметки" },
              ]}
            />
            <p className="mt-2 text-xs text-muted">Бонусы имплантов к атрибутам вводите во вкладке «Основное» (поле «+» у атрибута), доп. проходы — в блоке инициативы.</p>
          </Section>
          <Section title="Коммлинк и программы">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Field label="Коммлинк" className="col-span-2 sm:col-span-1">
                <input value={sheet.commlink.name} readOnly={readOnly} onChange={(e) => set("commlink", { ...sheet.commlink, name: e.target.value })} className="input" placeholder="Hermes Ikon" />
              </Field>
              {(["response", "signal", "system", "firewall"] as const).map((k) => (
                <Field key={k} label={{ response: "Отклик", signal: "Сигнал", system: "Система", firewall: "Файрвол" }[k]}>
                  <NumberInput value={sheet.commlink[k]} min={0} max={10} readOnly={readOnly} onChange={(v) => set("commlink", { ...sheet.commlink, [k]: v })} />
                </Field>
              ))}
            </div>
            <div className="mt-4">
              <ListEditor<Program>
                items={sheet.programs}
                onChange={(v) => set("programs", v)}
                readOnly={readOnly}
                create={() => ({ name: "", rating: 1, notes: "" })}
                columns={[
                  { key: "name", label: "Программа / комплексная форма", placeholder: "Эксплойт", wide: true },
                  { key: "rating", label: "Рейтинг", type: "number", className: "w-24" },
                  { key: "notes", label: "Заметки" },
                ]}
              />
            </div>
          </Section>
        </div>
      )}

      {tab === "social" && (
        <div className="grid gap-4">
          <Section title="Контакты">
            <ListEditor<Contact>
              items={sheet.contacts}
              onChange={(v) => set("contacts", v)}
              readOnly={readOnly}
              create={() => ({ name: "", connection: 1, loyalty: 1, notes: "" })}
              columns={[
                { key: "name", label: "Контакт", placeholder: "Фиксер «Рыжий»", wide: true },
                { key: "connection", label: "Связи", type: "number", className: "w-20" },
                { key: "loyalty", label: "Лояльность", type: "number", className: "w-24" },
                { key: "notes", label: "Заметки", wide: true },
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

      {roll && (
        <DiceTray
          key={roll.key}
          request={roll.request}
          edge={{
            rating: sheet.attributes.EDG,
            current: sheet.edgeCurrent,
            spend: readOnly ? undefined : () => set("edgeCurrent", Math.max(0, sheet.edgeCurrent - 1)),
          }}
          onClose={() => setRoll(null)}
        />
      )}
    </div>
  );
}

function AttributeCard({
  attribute,
  sheet,
  augmented,
  readOnly,
  onNatural,
  onAugment,
}: {
  attribute: AttributeKey;
  sheet: Sheet;
  augmented: number;
  readOnly: boolean;
  onNatural: (v: number) => void;
  onAugment?: (v: number) => void;
}) {
  const [min, max] = attribute === "MAG" || attribute === "RES" ? [0, 6] : range(sheet.metatype, attribute);
  const value = sheet.attributes[attribute];
  const outOfRange = value < min || value > max;
  const bonus = sheet.augments[attribute] ?? 0;
  return (
    <div className={`cut-corners-sm border bg-bg/50 p-2.5 ${outOfRange ? "border-warn/60" : "border-line"}`}>
      <div className="flex items-baseline justify-between gap-1">
        <span className="font-mono text-sm font-bold text-accent">{attribute}</span>
        <span className="font-mono text-[10px] text-muted" title="Естественный диапазон / аугментированный максимум">
          {min}–{max}
          {onAugment && ` / ${augmentedMax(sheet.metatype, attribute)}`}
        </span>
      </div>
      <p className="truncate text-[11px] text-muted">{ATTRIBUTE_LABELS[attribute]}</p>
      <div className="mt-1 flex items-center gap-1">
        <NumberInput value={value} min={0} max={15} readOnly={readOnly} onChange={onNatural} className="text-center font-display text-xl" />
        {onAugment && (
          <input
            type="number"
            inputMode="numeric"
            value={bonus || ""}
            placeholder="+"
            min={0}
            max={10}
            readOnly={readOnly}
            onChange={(e) => onAugment(Number(e.target.value) || 0)}
            className="input w-12 shrink-0 px-1 text-center font-mono text-accent-2"
            aria-label={`Бонус имплантов к ${attribute}`}
            title="Бонус имплантов"
          />
        )}
      </div>
      <p className="mt-1 flex justify-between font-mono text-[10px] text-muted">
        <span>{bonus ? <span className="text-accent-2">{value} ({augmented})</span> : " "}</span>
        <span title="Стоимость повышения в карме">↑{(value + 1) * 5}к</span>
      </p>
    </div>
  );
}

function Section({ title, hint, className = "", children }: { title: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`panel cut-corners p-4 ${className}`}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-accent">{"// "}{title}</h3>
        {hint && <span className="font-mono text-[11px] text-muted">{hint}</span>}
      </div>
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

function PoolButton({ pool, onClick, title }: { pool: number; onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="cut-corners-sm inline-flex min-h-11 items-center gap-1 whitespace-nowrap border border-accent/50 px-3 font-mono text-sm text-accent hover:bg-accent/10 sm:min-h-8 sm:px-2 sm:text-xs"
    >
      🎲 {pool}
    </button>
  );
}

function RollRow({ label, value, sub, onRoll }: { label: string; value: string; sub?: string; onRoll?: () => void }) {
  const content = (
    <>
      <span className="min-w-0">
        <span className="block truncate text-xs text-muted">{label}</span>
        {sub && <span className="block truncate font-mono text-[10px] text-slate-500">{sub}</span>}
      </span>
      <span className="flex items-center gap-2 font-display text-lg text-slate-100">
        {value}
        {onRoll && <span className="text-sm text-accent">🎲</span>}
      </span>
    </>
  );
  const cls = "cut-corners-sm flex min-h-12 w-full items-center justify-between gap-2 border border-line bg-bg/40 px-3 py-1.5 text-left";
  return onRoll ? (
    <button onClick={onRoll} className={`${cls} transition hover:border-accent/60`}>{content}</button>
  ) : (
    <div className={cls}>{content}</div>
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
      inputMode="numeric"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      className={`input ${className}`}
    />
  );
}

function Pips({ total, value, onChange, readOnly, color }: { total: number; value: number; onChange: (v: number) => void; readOnly: boolean; color: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: Math.max(0, total) }, (_, i) => (
        <button
          key={i}
          disabled={readOnly}
          onClick={() => onChange(value === i + 1 ? i : i + 1)}
          className={`h-8 w-8 rotate-45 border transition sm:h-6 sm:w-6 ${i < value ? `${color} border-transparent` : "border-line-hi bg-bg/60"}`}
          aria-label={`Грань: ${i + 1}`}
        />
      ))}
    </div>
  );
}

/** Clickable damage track: tap a box to set damage up to it, tap the last filled box to heal one. */
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
        <span className="font-mono text-muted">
          {Math.min(value, max)}/{max}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: max }, (_, i) => {
          const filled = i < value;
          return (
            <button
              key={i}
              disabled={readOnly}
              onClick={() => onChange(value === i + 1 ? i : i + 1)}
              className={`h-8 w-8 border font-mono text-[10px] transition sm:h-6 sm:w-6 ${
                filled ? `${color} border-transparent text-black` : "border-line bg-bg/60 hover:border-line-hi"
              } ${(i + 1) % 3 === 0 ? "mr-1.5" : ""}`}
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
