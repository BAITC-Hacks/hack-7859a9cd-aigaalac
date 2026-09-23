import assert from "node:assert/strict";
import test from "node:test";
import {
  CITY_BUDGET,
  DATASET_VERSION,
  DECISION_LIMIT,
  HORIZON_QUARTERS,
  INITIAL_QOL,
  MAX_PER_CATEGORY,
  districts,
} from "../src/data/districts.ts";
import { incompatibilities } from "../src/data/incompatibilities.ts";
import {
  INDICATOR_IDS,
  INDICATOR_LABELS,
  INDICATOR_METADATA,
  INDICATOR_WEIGHTS,
} from "../src/data/indicators.ts";
import { categories, measures } from "../src/data/measures.ts";
import { synergies } from "../src/data/synergies.ts";

// Source-fidelity checks: these independent tables transcribe the supplied brief,
// so a catalog edit cannot silently change the agreed simulation inputs.
test("all 50 district indicators and all population shares match the supplied dataset", () => {
  assert.deepEqual(
    districts.map(({ id, populationShare, indicators }) => [
      id,
      populationShare,
      ...INDICATOR_IDS.map((indicator) => indicators[indicator]),
    ]),
    [
      ["esil", 0.27, 45, 62, 68, 72, 48, 55, 78, 60, 75, 70],
      ["almaty", 0.24, 40, 75, 50, 55, 60, 65, 62, 52, 50, 60],
      ["saryarka", 0.2, 50, 70, 42, 40, 62, 68, 58, 55, 45, 55],
      ["baikonur", 0.13, 52, 68, 55, 50, 58, 60, 52, 58, 55, 58],
      ["nura", 0.16, 55, 40, 45, 65, 38, 35, 55, 50, 60, 50],
    ],
  );
  assert.equal(
    districts.reduce((sum, district) => sum + district.populationShare, 0),
    1,
  );
  for (const district of districts) {
    assert.deepEqual(Object.keys(district.indicators), [...INDICATOR_IDS]);
    assert.ok(
      Object.values(district.indicators).every(
        (value) => value >= 0 && value <= 100,
      ),
    );
  }
});

test("all indicator IDs, weights, and meanings cover the five required categories", () => {
  assert.deepEqual(
    [...INDICATOR_IDS],
    ["T1", "T2", "E1", "E2", "S1", "S2", "B1", "B2", "C1", "C2"],
  );
  assert.deepEqual(INDICATOR_WEIGHTS, {
    T1: 0.1,
    T2: 0.1,
    E1: 0.09,
    E2: 0.11,
    S1: 0.11,
    S2: 0.11,
    B1: 0.09,
    B2: 0.09,
    C1: 0.1,
    C2: 0.1,
  });
  assert.ok(
    Math.abs(
      Object.values(INDICATOR_WEIGHTS).reduce(
        (sum, weight) => sum + weight,
        0,
      ) - 1,
    ) < 1e-12,
  );
  assert.deepEqual(categories, [
    "Transport",
    "Environment",
    "Social",
    "Safety",
    "Services",
  ]);
  assert.deepEqual(
    INDICATOR_IDS.map((id) => INDICATOR_METADATA[id].category),
    [
      "Transport",
      "Transport",
      "Environment",
      "Environment",
      "Social",
      "Social",
      "Safety",
      "Safety",
      "Services",
      "Services",
    ],
  );
  for (const id of INDICATOR_IDS) {
    assert.equal(INDICATOR_METADATA[id].label, INDICATOR_LABELS[id]);
    assert.equal(INDICATOR_METADATA[id].higherIsBetter, true);
    assert.equal(INDICATOR_METADATA[id].min, 0);
    assert.equal(INDICATOR_METADATA[id].max, 100);
    assert.ok(INDICATOR_METADATA[id].bestScoreMeaning.length > 0);
  }
});

test("all 14 measures preserve their category, scope, cost, quarter lag, and signed effects", () => {
  assert.deepEqual(
    measures.map(({ id, category, scope, cost, lag, effects }) => [
      id,
      category,
      scope,
      cost,
      lag,
      effects,
    ]),
    [
      ["M1", "Transport", "district", 18, 2, { T1: 6, T2: 9 }],
      ["M2", "Transport", "city", 22, 2, { T1: 4, B2: 3 }],
      ["M3", "Transport", "district", 30, 4, { T1: 16, T2: 20, E2: 4 }],
      ["M4", "Environment", "district", 15, 2, { E1: 12, E2: 3, B1: 2 }],
      ["M5", "Environment", "district", 25, 3, { E2: 14, C1: 4 }],
      ["M6", "Environment", "city", 20, 4, { E1: 5, E2: 3 }],
      ["M7", "Social", "district", 24, 3, { S1: 16 }],
      ["M8", "Social", "district", 20, 3, { S2: 14 }],
      ["M9", "Social", "district", 10, 1, { S1: 3, S2: 3, B1: 3 }],
      ["M10", "Safety", "district", 12, 1, { B1: 12, B2: 2 }],
      ["M11", "Safety", "district", 10, 1, { B2: 12, T1: -2 }],
      ["M12", "Services", "city", 14, 1, { C2: 5 }],
      ["M13", "Services", "district", 28, 4, { C1: 18, E2: 2 }],
      ["M14", "Services", "city", 16, 1, { C1: 5, C2: 2 }],
    ],
  );
  assert.equal(new Set(measures.map(({ id }) => id)).size, 14);
});

test("all three synergies and incompatibilities retain their scope and targeting order", () => {
  assert.deepEqual(synergies, [
    { measureIds: ["M1", "M2"], effects: { T1: 2 } },
    { measureIds: ["M10", "M12"], effects: { B1: 2 } },
    { measureIds: ["M5", "M6"], effects: { E2: 2 } },
  ]);
  assert.deepEqual(
    incompatibilities.map(({ measureIds, scope }) => ({ measureIds, scope })),
    [
      { measureIds: ["M1", "M3"], scope: "global" },
      { measureIds: ["M4", "M7"], scope: "district" },
      { measureIds: ["M5", "M13"], scope: "district" },
    ],
  );
  for (const synergy of synergies) {
    assert.equal(
      measures.find(({ id }) => id === synergy.measureIds[0])?.scope,
      "district",
    );
  }
  assert.ok(incompatibilities.every(({ reason }) => reason.length > 0));
});

test("baseline scores are derived without rounding away precision", () => {
  assert.deepEqual(
    districts.map(({ score }) => Number(score.toFixed(2))),
    [62.99, 57.06, 54.65, 56.63, 49.18],
  );
  assert.ok(Math.abs(INITIAL_QOL - 52.55768) < 1e-10);
  const critical = districts.flatMap(({ id, indicators }) =>
    INDICATOR_IDS.filter((indicator) => indicators[indicator] < 40).map(
      (indicator) => `${id}:${indicator}`,
    ),
  );
  assert.deepEqual(critical, ["nura:S1", "nura:S2"]);
});

test("shared scenario constants and both supplied sample costs match the rules", () => {
  assert.equal(CITY_BUDGET, 100);
  assert.equal(DECISION_LIMIT, 5);
  assert.equal(HORIZON_QUARTERS, 8);
  assert.equal(MAX_PER_CATEGORY, 2);
  assert.equal(DATASET_VERSION, "astana-v1");
  const cost = (ids: string[]) =>
    ids.reduce(
      (sum, id) => sum + measures.find((measure) => measure.id === id)!.cost,
      0,
    );
  assert.equal(cost(["M7", "M8", "M10", "M12", "M5"]), 95);
  assert.equal(cost(["M9", "M11", "M10", "M12", "M4"]), 61);
});
