/**
 * Shadowrun 20th Anniversary Edition (SR4A) character sheet model, derived values and dice.
 * The API stores the sheet as free-form JSON; normalizeSheet() fills gaps for older sheets.
 * Kept free of React/Next imports so it can be unit-tested with `node --test`.
 */

export const ATTRIBUTES = ["BOD", "AGI", "REA", "STR", "CHA", "INT", "LOG", "WIL", "EDG", "MAG", "RES"] as const;
export type AttributeKey = (typeof ATTRIBUTES)[number];

export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  BOD: "Телосложение",
  AGI: "Ловкость",
  REA: "Реакция",
  STR: "Сила",
  CHA: "Харизма",
  INT: "Интуиция",
  LOG: "Логика",
  WIL: "Сила воли",
  EDG: "Грань",
  MAG: "Магия",
  RES: "Резонанс",
};

/** Attributes that cyberware/bioware/adept powers can raise (shown as "natural (augmented)"). */
export const AUGMENTABLE: readonly AttributeKey[] = ["BOD", "AGI", "REA", "STR", "CHA", "INT", "LOG", "WIL"];

export type Metatype = "Человек" | "Эльф" | "Дварф" | "Орк" | "Тролль";

interface MetatypeInfo {
  /** Natural minimum/maximum per attribute; anything not listed is 1/6. */
  ranges: Partial<Record<AttributeKey, [number, number]>>;
  traits: string;
  /** Natural armor added to both ballistic and impact (troll dermal deposits). */
  naturalArmor: number;
}

/** SR4A metatype attribute table. Augmented maximum is natural maximum × 1.5, rounded down. */
export const METATYPES: Record<Metatype, MetatypeInfo> = {
  Человек: { ranges: { EDG: [2, 7] }, traits: "+1 к Грани (максимум 7)", naturalArmor: 0 },
  Эльф: { ranges: { AGI: [2, 7], CHA: [3, 8] }, traits: "Зрение при слабом освещении", naturalArmor: 0 },
  Дварф: {
    ranges: { BOD: [2, 7], REA: [1, 5], STR: [3, 8], WIL: [2, 7] },
    traits: "Термографическое зрение, +2 кубика на сопротивление патогенам и токсинам",
    naturalArmor: 0,
  },
  Орк: { ranges: { BOD: [4, 9], STR: [3, 8], CHA: [1, 5], LOG: [1, 5] }, traits: "Зрение при слабом освещении", naturalArmor: 0 },
  Тролль: {
    ranges: { BOD: [5, 10], AGI: [1, 5], STR: [5, 10], CHA: [1, 4], INT: [1, 5], LOG: [1, 5] },
    traits: "Термографическое зрение, +1 досягаемость, кожные наросты (+1 к броне)",
    naturalArmor: 1,
  },
};
export const METATYPE_NAMES = Object.keys(METATYPES) as Metatype[];

export const ROLES = [
  "Уличный самурай",
  "Хакер",
  "Риггер",
  "Маг (герметист)",
  "Шаман",
  "Адепт",
  "Мистический адепт",
  "Техномант",
  "Фейс",
  "Инфильтратор",
  "Уличный док",
  "Детектив",
];

export const LIFESTYLES = [
  { value: "street", label: "Улица", cost: 0 },
  { value: "squatter", label: "Сквоттер", cost: 500 },
  { value: "low", label: "Низкий", cost: 2000 },
  { value: "middle", label: "Средний", cost: 5000 },
  { value: "high", label: "Высокий", cost: 10000 },
  { value: "luxury", label: "Роскошный", cost: 100000 },
] as const;

export const TRADITIONS = [
  { value: "none", label: "Нет (не пробуждён)" },
  { value: "hermetic", label: "Герметическая (Логика)" },
  { value: "shamanic", label: "Шаманская (Харизма)" },
  { value: "technomancer", label: "Техномант (угасание: Резонанс)" },
] as const;
export type Tradition = (typeof TRADITIONS)[number]["value"];

export const KNOWLEDGE_CATEGORIES = [
  { value: "street", label: "Уличные (INT)" },
  { value: "interests", label: "Интересы (INT)" },
  { value: "academic", label: "Академические (LOG)" },
  { value: "professional", label: "Профессиональные (LOG)" },
  { value: "language", label: "Язык (INT)" },
] as const;
export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number]["value"];

export interface Skill {
  name: string;
  group: string;
  attribute: AttributeKey;
  rating: number;
  specialization: string;
}
export interface KnowledgeSkill {
  name: string;
  category: KnowledgeCategory;
  rating: number;
  specialization: string;
  native: boolean;
}
export interface Quality {
  name: string;
  kind: "positive" | "negative";
  bp: number;
  notes: string;
}
export interface Weapon {
  name: string;
  skill: string;
  damage: string;
  ap: string;
  mode: string;
  rc: string;
  ammo: string;
  reach: string;
  notes: string;
}
export interface ArmorItem {
  name: string;
  ballistic: number;
  impact: number;
  /** Helmets, shields, form-fitting armor add on top of the best regular armor. */
  stacks: boolean;
  equipped: boolean;
}
export interface Augmentation {
  name: string;
  grade: string;
  rating: number;
  essence: number;
  notes: string;
}
export interface Spell {
  name: string;
  category: string;
  type: string;
  range: string;
  damage: string;
  duration: string;
  drain: string;
}
export interface AdeptPower {
  name: string;
  level: number;
  cost: number;
  notes: string;
}
export interface Program {
  name: string;
  rating: number;
  notes: string;
}
export interface Vehicle {
  name: string;
  handling: string;
  accel: string;
  speed: string;
  pilot: number;
  body: number;
  armor: number;
  sensor: number;
}
export interface GearItem {
  name: string;
  qty: number;
  notes: string;
}
export interface Contact {
  name: string;
  connection: number;
  loyalty: number;
  notes: string;
}

export interface Sheet {
  rules: "SR4A";
  metatype: Metatype;
  role: string;
  realName: string;
  concept: string;
  /** Natural ratings. */
  attributes: Record<AttributeKey, number>;
  /** Bonuses from augmentations/powers, added on top of natural ratings. */
  augments: Partial<Record<AttributeKey, number>>;
  /** Extra Initiative Passes from wired reflexes, synaptic boosters, etc. */
  extraPasses: number;
  edgeCurrent: number;
  tradition: Tradition;
  karma: number;
  careerKarma: number;
  nuyen: number;
  streetCred: number;
  notoriety: number;
  publicAwareness: number;
  lifestyle: string;
  sins: string;
  damage: { physical: number; stun: number };
  skills: Skill[];
  knowledge: KnowledgeSkill[];
  qualities: Quality[];
  weapons: Weapon[];
  armor: ArmorItem[];
  augmentations: Augmentation[];
  spells: Spell[];
  powers: AdeptPower[];
  commlink: { name: string; response: number; signal: number; system: number; firewall: number };
  programs: Program[];
  vehicles: Vehicle[];
  gear: GearItem[];
  contacts: Contact[];
  background: string;
}

export function emptySheet(metatype: Metatype = "Человек"): Sheet {
  const attributes = Object.fromEntries(ATTRIBUTES.map((a) => [a, range(metatype, a)[0]])) as Record<AttributeKey, number>;
  attributes.MAG = 0;
  attributes.RES = 0;
  return {
    rules: "SR4A",
    metatype,
    role: "",
    realName: "",
    concept: "",
    attributes,
    augments: {},
    extraPasses: 0,
    edgeCurrent: attributes.EDG,
    tradition: "none",
    karma: 0,
    careerKarma: 0,
    nuyen: 0,
    streetCred: 0,
    notoriety: 0,
    publicAwareness: 0,
    lifestyle: "low",
    sins: "",
    damage: { physical: 0, stun: 0 },
    skills: [],
    knowledge: [],
    qualities: [],
    weapons: [],
    armor: [],
    augmentations: [],
    spells: [],
    powers: [],
    commlink: { name: "", response: 0, signal: 0, system: 0, firewall: 0 },
    programs: [],
    vehicles: [],
    gear: [],
    contacts: [],
    background: "",
  };
}

const list = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/** Merges whatever the server returned over defaults so older or partial sheets still render. */
export function normalizeSheet(raw: unknown): Sheet {
  if (!raw || typeof raw !== "object") return emptySheet();
  const r = raw as Partial<Sheet> & Record<string, unknown>;
  const metatype: Metatype = r.metatype && r.metatype in METATYPES ? r.metatype : "Человек";
  const base = emptySheet(metatype);
  return {
    ...base,
    ...r,
    rules: "SR4A",
    metatype,
    attributes: { ...base.attributes, ...(r.attributes ?? {}) },
    augments: { ...(r.augments ?? {}) },
    damage: { ...base.damage, ...(r.damage ?? {}) },
    commlink: { ...base.commlink, ...(r.commlink ?? {}) },
    skills: list<Skill>(r.skills).map((s) => ({ ...s, group: s.group ?? "" })),
    knowledge: list<KnowledgeSkill>(r.knowledge),
    qualities: list<Quality & { karma?: number }>(r.qualities).map((q) => ({ ...q, bp: q.bp ?? q.karma ?? 0 })),
    weapons: list<Weapon>(r.weapons),
    // Older sheets had a single armor "rating".
    armor: list<ArmorItem & { rating?: number }>(r.armor).map((a) => ({
      name: a.name ?? "",
      ballistic: a.ballistic ?? a.rating ?? 0,
      impact: a.impact ?? a.rating ?? 0,
      stacks: a.stacks ?? false,
      equipped: a.equipped ?? true,
    })),
    augmentations: list<Augmentation>(r.augmentations),
    spells: list<Spell>(r.spells),
    powers: list<AdeptPower>(r.powers),
    programs: list<Program>(r.programs),
    vehicles: list<Vehicle>(r.vehicles),
    gear: list<GearItem>(r.gear),
    contacts: list<Contact>(r.contacts),
  };
}

/** Natural [min, max] for an attribute of a metatype. */
export function range(metatype: Metatype, attribute: AttributeKey): [number, number] {
  return METATYPES[metatype]?.ranges[attribute] ?? [1, 6];
}

export function augmentedMax(metatype: Metatype, attribute: AttributeKey): number {
  return Math.floor(range(metatype, attribute)[1] * 1.5);
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);

export interface Derived {
  /** Augmented attribute values (natural + bonus, capped at the augmented maximum). */
  attr: Record<AttributeKey, number>;
  essence: number;
  /** Magic/Resonance lost to Essence loss: 1 per point of Essence lost or fraction thereof. */
  magicLoss: number;
  ballistic: number;
  impact: number;
  /** Points by which the heavier armor rating exceeds Body × 2 (0 when unencumbered). */
  armorExcess: number;
  physicalMonitor: number;
  stunMonitor: number;
  overflow: number;
  woundModifier: number;
  initiative: number;
  initiativePasses: number;
  astralInitiative: number;
  matrixInitiative: number;
  drainResist: number | null;
  drainLabel: string | null;
  composure: number;
  judgeIntentions: number;
  memory: number;
  liftCarry: number;
  freeKnowledgePoints: number;
  usedKnowledgePoints: number;
  positiveBp: number;
  negativeBp: number;
  powerPointsUsed: number;
  lifestyleCost: number;
  suggestedStreetCred: number;
}

export function derive(sheet: Sheet): Derived {
  const n = sheet.attributes;
  const attr = Object.fromEntries(
    ATTRIBUTES.map((a) => [a, Math.min(num(n[a]) + num(sheet.augments[a]), augmentedMax(sheet.metatype, a))]),
  ) as Record<AttributeKey, number>;
  // MAG/RES/EDG are never augmented above their natural rating by gear.
  attr.EDG = num(n.EDG);
  attr.MAG = num(n.MAG);
  attr.RES = num(n.RES);

  const essenceSpent = sheet.augmentations.reduce((sum, aug) => sum + num(aug.essence), 0);
  const essence = Math.max(0, Math.round((6 - essenceSpent) * 100) / 100);
  const magicLoss = Math.ceil(Math.round((6 - essence) * 100) / 100);

  const natural = METATYPES[sheet.metatype]?.naturalArmor ?? 0;
  const worn = sheet.armor.filter((a) => a.equipped);
  const best = (key: "ballistic" | "impact") =>
    Math.max(0, ...worn.filter((a) => !a.stacks).map((a) => num(a[key]))) +
    worn.filter((a) => a.stacks).reduce((s, a) => s + num(a[key]), 0) +
    natural;
  const ballistic = best("ballistic");
  const impact = best("impact");

  const woundModifier = -(Math.floor(num(sheet.damage.physical) / 3) + Math.floor(num(sheet.damage.stun) / 3));

  let drainResist: number | null = null;
  let drainLabel: string | null = null;
  if (sheet.tradition === "hermetic") [drainResist, drainLabel] = [attr.WIL + attr.LOG, "Истощение: WIL + LOG"];
  if (sheet.tradition === "shamanic") [drainResist, drainLabel] = [attr.WIL + attr.CHA, "Истощение: WIL + CHA"];
  if (sheet.tradition === "technomancer") [drainResist, drainLabel] = [attr.WIL + attr.RES, "Угасание: WIL + RES"];

  const usedKnowledgePoints = sheet.knowledge.filter((k) => !k.native).reduce((s, k) => s + num(k.rating), 0);

  return {
    attr,
    essence,
    magicLoss,
    ballistic,
    impact,
    armorExcess: Math.max(0, Math.max(ballistic - natural, impact - natural) - attr.BOD * 2),
    physicalMonitor: 8 + Math.ceil(attr.BOD / 2),
    stunMonitor: 8 + Math.ceil(attr.WIL / 2),
    overflow: attr.BOD,
    woundModifier,
    initiative: attr.REA + attr.INT,
    initiativePasses: Math.min(4, 1 + Math.max(0, num(sheet.extraPasses))),
    astralInitiative: attr.INT * 2,
    matrixInitiative: num(sheet.commlink.response) + attr.INT,
    drainResist,
    drainLabel,
    composure: attr.CHA + attr.WIL,
    judgeIntentions: attr.CHA + attr.INT,
    memory: attr.LOG + attr.WIL,
    liftCarry: attr.BOD + attr.STR,
    freeKnowledgePoints: (num(n.INT) + num(n.LOG)) * 3,
    usedKnowledgePoints,
    positiveBp: sheet.qualities.filter((q) => q.kind === "positive").reduce((s, q) => s + num(q.bp), 0),
    negativeBp: sheet.qualities.filter((q) => q.kind === "negative").reduce((s, q) => s + num(q.bp), 0),
    powerPointsUsed: sheet.powers.reduce((s, p) => s + num(p.cost), 0),
    lifestyleCost: LIFESTYLES.find((l) => l.value === sheet.lifestyle)?.cost ?? 0,
    suggestedStreetCred: Math.floor(num(sheet.careerKarma) / 10),
  };
}

/** Karma to raise something by one rating (SR4A advancement table). */
export const karmaCost = {
  attribute: (newRating: number) => newRating * 5,
  activeSkill: (newRating: number) => (newRating <= 1 ? 4 : newRating * 2),
  knowledgeSkill: (newRating: number) => (newRating <= 1 ? 2 : newRating),
  specialization: 2,
  spell: 5,
};

export function knowledgeAttribute(category: KnowledgeCategory): AttributeKey {
  return category === "academic" || category === "professional" ? "LOG" : "INT";
}

/** Dice pool for an active skill; untrained skills default to attribute − 1. */
export function skillPool(skill: Pick<Skill, "rating" | "attribute">, d: Derived): number {
  const rating = num(skill.rating);
  const attribute = d.attr[skill.attribute] ?? 0;
  return rating > 0 ? rating + attribute : Math.max(0, attribute - 1);
}

export function findSkill(sheet: Sheet, pattern: RegExp): Skill | undefined {
  return sheet.skills.find((s) => pattern.test(s.name));
}

// ---- dice ------------------------------------------------------------------------------------

export interface Die {
  value: number;
  /** Rolled because a previous die showed a 6 under the Rule of Six. */
  exploded?: boolean;
  /** Rerolled with Second Chance. */
  rerolled?: boolean;
}

export interface RollResult {
  pool: number;
  dice: Die[];
  hits: number;
  ones: number;
  glitch: boolean;
  criticalGlitch: boolean;
  edgeUsed: boolean;
}

export type Rng = () => number;
const d6 = (rng: Rng) => 1 + Math.floor(rng() * 6);

function evaluate(pool: number, dice: Die[], edgeUsed: boolean): RollResult {
  const hits = dice.filter((d) => d.value >= 5).length;
  // Glitches count the dice of the original pool only, not extra Rule-of-Six dice.
  const ones = dice.filter((d) => !d.exploded && d.value === 1).length;
  const glitch = pool > 0 && ones * 2 >= pool;
  return { pool, dice, hits, ones, glitch, criticalGlitch: glitch && hits === 0, edgeUsed };
}

/**
 * SR4A test: 5s and 6s are hits. A glitch happens when half or more of the dice show 1;
 * a glitch without hits is a critical glitch. With Edge spent before the roll the Rule of
 * Six applies: every 6 is counted and rolled again.
 */
export function rollPool(pool: number, options: { ruleOfSix?: boolean; rng?: Rng } = {}): RollResult {
  const rng = options.rng ?? Math.random;
  const n = Math.max(0, Math.min(60, Math.floor(pool)));
  const dice: Die[] = [];
  for (let i = 0; i < n; i++) {
    let value = d6(rng);
    dice.push({ value });
    let guard = 0;
    while (options.ruleOfSix && value === 6 && guard++ < 20) {
      value = d6(rng);
      dice.push({ value, exploded: true });
    }
  }
  return evaluate(n, dice, Boolean(options.ruleOfSix));
}

/** Edge after the roll ("second chance"): reroll every die that did not score a hit. */
export function secondChance(result: RollResult, rng: Rng = Math.random): RollResult {
  const dice = result.dice.map((d) => (d.value >= 5 ? d : { ...d, value: d6(rng), rerolled: true }));
  return evaluate(result.pool, dice, true);
}
