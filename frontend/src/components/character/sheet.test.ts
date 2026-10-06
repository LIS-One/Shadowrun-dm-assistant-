import assert from "node:assert/strict";
import { test } from "node:test";
import { augmentedMax, derive, emptySheet, normalizeSheet, rollPool, secondChance, skillPool, type Rng } from "./sheet.ts";

/** Deterministic dice: returns the given faces in order. */
const faces = (...values: number[]): Rng => {
  let i = 0;
  return () => (values[i++ % values.length] - 1) / 6 + 0.01;
};

test("metatype ranges and augmented maximum follow the SR4A table", () => {
  const troll = emptySheet("Тролль");
  assert.equal(troll.attributes.BOD, 5);
  assert.equal(troll.attributes.STR, 5);
  assert.equal(augmentedMax("Тролль", "BOD"), 15);
  assert.equal(augmentedMax("Человек", "AGI"), 9);
  assert.equal(emptySheet("Человек").attributes.EDG, 2);
});

test("condition monitors, initiative and attribute-only tests", () => {
  const s = emptySheet("Человек");
  Object.assign(s.attributes, { BOD: 5, WIL: 3, REA: 4, INT: 3, CHA: 2, LOG: 4, STR: 3 });
  s.augments = { REA: 2 };
  s.extraPasses = 2;
  const d = derive(s);
  assert.equal(d.physicalMonitor, 11); // 8 + ceil(5/2)
  assert.equal(d.stunMonitor, 10); // 8 + ceil(3/2)
  assert.equal(d.initiative, 9); // REA 4+2 augmented + INT 3
  assert.equal(d.initiativePasses, 3);
  assert.equal(d.astralInitiative, 6);
  assert.equal(d.composure, 5);
  assert.equal(d.memory, 7);
  assert.equal(d.freeKnowledgePoints, 21); // (INT 3 + LOG 4) × 3
});

test("augmented attributes are capped at 1.5 × natural maximum", () => {
  const s = emptySheet("Человек");
  s.attributes.AGI = 6;
  s.augments = { AGI: 6 };
  assert.equal(derive(s).attr.AGI, 9);
});

test("wound modifier is −1 per 3 boxes on each track", () => {
  const s = emptySheet();
  s.damage = { physical: 5, stun: 6 };
  assert.equal(derive(s).woundModifier, -3);
});

test("armor: best regular piece plus stacking pieces plus troll dermal armor", () => {
  const s = emptySheet("Тролль");
  s.armor = [
    { name: "Бронекуртка", ballistic: 8, impact: 6, stacks: false, equipped: true },
    { name: "Бронежилет", ballistic: 6, impact: 4, stacks: false, equipped: true },
    { name: "Шлем", ballistic: 1, impact: 2, stacks: true, equipped: true },
    { name: "Дома", ballistic: 12, impact: 12, stacks: false, equipped: false },
  ];
  const d = derive(s);
  assert.equal(d.ballistic, 10);
  assert.equal(d.impact, 9);
  assert.equal(d.armorExcess, 0);
});

test("essence loss reduces magic by one per point or fraction", () => {
  const s = emptySheet();
  s.augmentations = [{ name: "Кибероко", grade: "Стандарт", rating: 1, essence: 0.2, notes: "" }];
  const d = derive(s);
  assert.equal(d.essence, 5.8);
  assert.equal(d.magicLoss, 1);
});

test("drain resistance depends on the tradition", () => {
  const s = emptySheet();
  Object.assign(s.attributes, { WIL: 4, LOG: 5, CHA: 3 });
  s.tradition = "hermetic";
  assert.equal(derive(s).drainResist, 9);
  s.tradition = "shamanic";
  assert.equal(derive(s).drainResist, 7);
});

test("skill pool is rating + attribute, untrained defaults to attribute − 1", () => {
  const s = emptySheet();
  s.attributes.AGI = 4;
  const d = derive(s);
  assert.equal(skillPool({ rating: 3, attribute: "AGI" }, d), 7);
  assert.equal(skillPool({ rating: 0, attribute: "AGI" }, d), 3);
});

test("a glitch is half or more ones; with no hits it is critical", () => {
  const glitch = rollPool(4, { rng: faces(1, 1, 5, 3) });
  assert.equal(glitch.hits, 1);
  assert.ok(glitch.glitch);
  assert.ok(!glitch.criticalGlitch);

  const critical = rollPool(4, { rng: faces(1, 1, 2, 3) });
  assert.ok(critical.criticalGlitch);

  const clean = rollPool(5, { rng: faces(1, 1, 2, 3, 4) });
  assert.ok(!clean.glitch);
});

test("rule of six rerolls sixes and counts every hit", () => {
  const r = rollPool(2, { ruleOfSix: true, rng: faces(6, 6, 2, 5) });
  assert.deepEqual(r.dice.map((d) => d.value), [6, 6, 2, 5]);
  assert.equal(r.hits, 3);
});

test("second chance rerolls only the misses", () => {
  const first = rollPool(3, { rng: faces(5, 1, 2) });
  const second = secondChance(first, faces(6, 3));
  assert.deepEqual(second.dice.map((d) => d.value), [5, 6, 3]);
  assert.equal(second.hits, 2);
  assert.ok(second.edgeUsed);
});

test("older sheets are normalized", () => {
  const s = normalizeSheet({ metatype: "Эльф", armor: [{ name: "Куртка", rating: 6, equipped: true }], qualities: [{ name: "X", kind: "positive", karma: 5 }] });
  assert.equal(s.armor[0].ballistic, 6);
  assert.equal(s.qualities[0].bp, 5);
  assert.equal(s.attributes.CHA, 3);
});
