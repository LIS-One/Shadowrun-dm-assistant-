/** Shadowrun character sheet model. Stored as free-form JSON by the API; normalized here. */

export const ATTRIBUTES = ["BOD", "AGI", "REA", "STR", "WIL", "LOG", "INT", "CHA", "EDG", "MAG", "RES"] as const;
export type AttributeKey = (typeof ATTRIBUTES)[number];

export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  BOD: "Телосложение",
  AGI: "Ловкость",
  REA: "Реакция",
  STR: "Сила",
  WIL: "Сила воли",
  LOG: "Логика",
  INT: "Интуиция",
  CHA: "Харизма",
  EDG: "Грань",
  MAG: "Магия",
  RES: "Резонанс",
};

export const METATYPES = ["Человек", "Эльф", "Дварф", "Орк", "Тролль"];
export const ROLES = [
  "Уличный самурай",
  "Декер",
  "Риггер",
  "Маг",
  "Шаман",
  "Адепт",
  "Техномант",
  "Фейс",
  "Инфильтратор",
  "Уличный док",
];

export interface Skill {
  name: string;
  attribute: AttributeKey;
  rating: number;
  specialization: string;
}
export interface Quality {
  name: string;
  kind: "positive" | "negative";
  karma: number;
  notes: string;
}
export interface Weapon {
  name: string;
  damage: string;
  ap: string;
  mode: string;
  accuracy: string;
  ammo: string;
  notes: string;
}
export interface ArmorItem {
  name: string;
  rating: number;
  equipped: boolean;
}
export interface Augmentation {
  name: string;
  grade: string;
  rating: number;
  essence: number;
  notes: string;
}
export interface MagicEntry {
  name: string;
  kind: string;
  drain: string;
  notes: string;
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
  edition: "SR5" | "SR6";
  metatype: string;
  role: string;
  realName: string;
  concept: string;
  attributes: Record<AttributeKey, number>;
  edgeCurrent: number;
  karma: number;
  totalKarma: number;
  nuyen: number;
  streetCred: number;
  notoriety: number;
  lifestyle: string;
  sins: string;
  damage: { physical: number; stun: number };
  skills: Skill[];
  qualities: Quality[];
  weapons: Weapon[];
  armor: ArmorItem[];
  augmentations: Augmentation[];
  magic: MagicEntry[];
  gear: GearItem[];
  contacts: Contact[];
  matrix: { deck: string; deviceRating: number; attack: number; sleaze: number; dataProcessing: number; firewall: number };
  background: string;
}

export function emptySheet(): Sheet {
  return {
    edition: "SR5",
    metatype: "Человек",
    role: "",
    realName: "",
    concept: "",
    attributes: { BOD: 3, AGI: 3, REA: 3, STR: 3, WIL: 3, LOG: 3, INT: 3, CHA: 3, EDG: 2, MAG: 0, RES: 0 },
    edgeCurrent: 2,
    karma: 0,
    totalKarma: 0,
    nuyen: 0,
    streetCred: 0,
    notoriety: 0,
    lifestyle: "Low",
    sins: "",
    damage: { physical: 0, stun: 0 },
    skills: [],
    qualities: [],
    weapons: [],
    armor: [],
    augmentations: [],
    magic: [],
    gear: [],
    contacts: [],
    matrix: { deck: "", deviceRating: 0, attack: 0, sleaze: 0, dataProcessing: 0, firewall: 0 },
    background: "",
  };
}

/** Merges whatever the server returned over defaults so older or partial sheets still render. */
export function normalizeSheet(raw: unknown): Sheet {
  const base = emptySheet();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<Sheet>;
  return {
    ...base,
    ...r,
    attributes: { ...base.attributes, ...(r.attributes ?? {}) },
    damage: { ...base.damage, ...(r.damage ?? {}) },
    matrix: { ...base.matrix, ...(r.matrix ?? {}) },
    skills: Array.isArray(r.skills) ? r.skills : [],
    qualities: Array.isArray(r.qualities) ? r.qualities : [],
    weapons: Array.isArray(r.weapons) ? r.weapons : [],
    armor: Array.isArray(r.armor) ? r.armor : [],
    augmentations: Array.isArray(r.augmentations) ? r.augmentations : [],
    magic: Array.isArray(r.magic) ? r.magic : [],
    gear: Array.isArray(r.gear) ? r.gear : [],
    contacts: Array.isArray(r.contacts) ? r.contacts : [],
  };
}

export interface Derived {
  essence: number;
  armor: number;
  physicalMonitor: number;
  stunMonitor: number;
  overflow: number;
  woundModifier: number;
  initiative: string;
  astralInitiative: string;
  matrixInitiative: string;
  limits: { physical: number; mental: number; social: number } | null;
  defenseRating: number | null;
  composure: number;
  judgeIntentions: number;
  memory: number;
  liftCarry: number;
}

export function derive(sheet: Sheet): Derived {
  const a = sheet.attributes;
  const essenceSpent = sheet.augmentations.reduce((sum, aug) => sum + (Number(aug.essence) || 0), 0);
  const essence = Math.max(0, Math.round((6 - essenceSpent) * 100) / 100);
  const armor = sheet.armor.filter((x) => x.equipped).reduce((sum, x) => sum + (Number(x.rating) || 0), 0);
  const physicalMonitor = 8 + Math.ceil(a.BOD / 2);
  const stunMonitor = 8 + Math.ceil(a.WIL / 2);
  const woundModifier = -(Math.floor(sheet.damage.physical / 3) + Math.floor(sheet.damage.stun / 3));
  const sr5 = sheet.edition === "SR5";
  return {
    essence,
    armor,
    physicalMonitor,
    stunMonitor,
    overflow: a.BOD,
    woundModifier,
    initiative: `${a.REA + a.INT} + 1D6`,
    astralInitiative: sr5 ? `${a.INT * 2} + 2D6` : `${a.INT + a.LOG} + 2D6`,
    matrixInitiative: `${sheet.matrix.dataProcessing + a.INT} + ${sr5 ? "3D6 / 4D6" : "2D6 / 3D6"}`,
    limits: sr5
      ? {
          physical: Math.ceil((a.STR * 2 + a.BOD + a.REA) / 3),
          mental: Math.ceil((a.LOG * 2 + a.INT + a.WIL) / 3),
          social: Math.ceil((a.CHA * 2 + a.WIL + essence) / 3),
        }
      : null,
    defenseRating: sr5 ? null : a.BOD + armor,
    composure: a.CHA + a.WIL,
    judgeIntentions: a.CHA + a.INT,
    memory: a.LOG + a.WIL,
    liftCarry: a.BOD + a.STR,
  };
}

export interface RollResult {
  pool: number;
  dice: number[];
  hits: number;
  ones: number;
  glitch: boolean;
  criticalGlitch: boolean;
}

/** Shadowrun roll: 5s and 6s are hits; more than half 1s is a glitch, with no hits a critical one. */
export function rollPool(pool: number): RollResult {
  const n = Math.max(0, Math.min(60, Math.floor(pool)));
  const dice = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6));
  const hits = dice.filter((d) => d >= 5).length;
  const ones = dice.filter((d) => d === 1).length;
  const glitch = n > 0 && ones > n / 2;
  return { pool: n, dice, hits, ones, glitch, criticalGlitch: glitch && hits === 0 };
}
