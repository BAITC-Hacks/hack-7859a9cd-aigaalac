import assert from "node:assert/strict";
import test from "node:test";
import { simulationRepository } from "../lib/data.ts";
import {
  CATEGORIES, HORIZON_QUARTERS, METRIC_KEYS, METRIC_WEIGHTS, TOTAL_BUDGET,
  SelectionValidationError, applyImpacts, calculateAverageMetrics, calculateDistrictScore,
  calculateRealizedShare, clampMetric, createSnapshot, getAppliedSynergies,
  previewDecisions, simulateDecisions, validateSelection,
} from "../lib/score.ts";
import type { Action, Decision, District, SelectedAction, ValidationCode } from "../lib/types.ts";

const districts = await simulationRepository.getDistricts();
const catalog = await simulationRepository.getActions();
const reference: Decision[] = [
  { actionId: "M7", districtId: "nura" }, { actionId: "M1", districtId: "nura" },
  { actionId: "M10", districtId: "nura" }, { actionId: "M12" }, { actionId: "M5", districtId: "saryarka" },
];
function close(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
}
function selected(id: string, districtId?: string): SelectedAction {
  const action = catalog.find((item) => item.id === id)!;
  return { ...action, ...(districtId === undefined ? {} : { districtId }) };
}
function hasIssue(input: unknown, code: ValidationCode): void {
  assert.ok(validateSelection(input, catalog, districts).issues.some((issue) => issue.code === code), code);
}

test("the source dataset has five districts, population shares, ten indicators and fourteen exact measures", () => {
  assert.equal(TOTAL_BUDGET, 100);
  assert.equal(HORIZON_QUARTERS, 8);
  assert.deepEqual(districts.map((district) => district.id), ["esil", "almaty", "saryarka", "baikonur", "nura"]);
  assert.deepEqual(districts.map((district) => district.populationShare), [0.27, 0.24, 0.20, 0.13, 0.16]);
  const expectedMetrics = [
    [45, 62, 68, 72, 48, 55, 78, 60, 75, 70],
    [40, 75, 50, 55, 60, 65, 62, 52, 50, 60],
    [50, 70, 42, 40, 62, 68, 58, 55, 45, 55],
    [52, 68, 55, 50, 58, 60, 52, 58, 55, 58],
    [55, 40, 45, 65, 38, 35, 55, 50, 60, 50],
  ];
  districts.forEach((district, index) => {
    assert.deepEqual(METRIC_KEYS.map((key) => district.metrics[key]), expectedMetrics[index]);
    assert.equal(Object.keys(district.metrics).length, 10);
    assert.ok(district.name && district.character && district.description);
  });
  assert.deepEqual(METRIC_KEYS.map((key) => METRIC_WEIGHTS[key]), [.10, .10, .09, .11, .11, .11, .09, .09, .10, .10]);
  close(Object.values(METRIC_WEIGHTS).reduce((sum, weight) => sum + weight, 0), 1);
  assert.equal(catalog.length, 14);
  assert.deepEqual(CATEGORIES.map((category) => catalog.filter((action) => action.category === category).length), [3, 3, 3, 2, 3]);
  const expected = [
    ["M1", "district", 18, 2, { T1: 6, T2: 9 }],
    ["M2", "city", 22, 2, { T1: 4, B2: 3 }],
    ["M3", "district", 30, 4, { T1: 16, T2: 20, E2: 4 }],
    ["M4", "district", 15, 2, { E1: 12, E2: 3, B1: 2 }],
    ["M5", "district", 25, 3, { E2: 14, C1: 4 }],
    ["M6", "city", 20, 4, { E1: 5, E2: 3 }],
    ["M7", "district", 24, 3, { S1: 16 }],
    ["M8", "district", 20, 3, { S2: 14 }],
    ["M9", "district", 10, 1, { S1: 3, S2: 3, B1: 3 }],
    ["M10", "district", 12, 1, { B1: 12, B2: 2 }],
    ["M11", "district", 10, 1, { B2: 12, T1: -2 }],
    ["M12", "city", 14, 1, { C2: 5 }],
    ["M13", "district", 28, 4, { C1: 18, E2: 2 }],
    ["M14", "city", 16, 1, { C1: 5, C2: 2 }],
  ];
  assert.deepEqual(catalog.map((action) => [action.id, action.scope, action.cost, action.lag, action.impact]), expected);
  for (const action of catalog) assert.ok(action.title && action.description);
});

test("baseline matches the source weighted D scores and exact 52.55768 city formula", () => {
  const snapshot = createSnapshot(districts);
  [62.99, 57.06, 54.65, 56.63, 49.18].forEach((score, index) => close(snapshot.districtScores[districts[index].id], score));
  close(snapshot.weightedAverage, 56.8624);
  close(snapshot.weakestDistrictScore, 49.18);
  assert.equal(snapshot.criticalCount, 2);
  assert.deepEqual(snapshot.criticalIndicators, [
    { districtId: "nura", metric: "S1", value: 38 }, { districtId: "nura", metric: "S2", value: 35 },
  ]);
  close(snapshot.score, 52.55768);
  close(calculateDistrictScore(calculateAverageMetrics(districts)), snapshot.weightedAverage);
  close(snapshot.averageMetrics.T1, 47.31);
});

test("reference plan costs 93 and produces 55.61002 with the Nura synergy and one remaining critical indicator", () => {
  const result = simulateDecisions(districts, catalog, reference);
  assert.equal(result.totalCost, 93);
  assert.equal(result.remainingBudget, 7);
  close(result.after.score, 55.61002);
  close(result.scoreChange, 3.05234);
  close(result.after.weightedAverage, 58.1036);
  close(result.after.weakestDistrictScore, 53.125);
  assert.equal(result.after.criticalCount, 1);
  const nura = result.after.districts.find((district) => district.id === "nura")!.metrics;
  assert.equal(nura.S1, 48);
  assert.equal(nura.S2, 35);
  assert.equal(nura.B1, 67.5);
  assert.equal(nura.B2, 51.75);
  assert.equal(nura.C2, 54.375);
  assert.deepEqual(result.synergies, [{ id: "M10+M12", actionIds: ["M10", "M12"], districtId: "nura", impact: { B1: 2 } }]);
});

test("district effects stay local and city effects reach all districts with the specified lag", () => {
  const local = applyImpacts(districts, [selected("M3", "nura")]);
  for (let index = 0; index < 4; index++) assert.deepEqual(local[index], districts[index]);
  close(local[4].metrics.T1 - districts[4].metrics.T1, 8);
  close(local[4].metrics.T2 - districts[4].metrics.T2, 10);
  close(local[4].metrics.E2 - districts[4].metrics.E2, 2);
  const city = applyImpacts(districts, [selected("M2")]);
  city.forEach((district, index) => {
    close(district.metrics.T1 - districts[index].metrics.T1, 3);
    close(district.metrics.B2 - districts[index].metrics.B2, 2.25);
  });
  for (const [lag, share] of [[0, 1], [1, .875], [2, .75], [3, .625], [4, .5], [8, 0]]) close(calculateRealizedShare({ lag }), share);
});

test("all three fixed synergies target the first measure's district without lag scaling", () => {
  for (const [firstId, secondId, metric] of [["M1", "M2", "T1"], ["M10", "M12", "B1"], ["M5", "M6", "E2"]] as const) {
    const actions = [selected(firstId, "nura"), selected(secondId)];
    assert.deepEqual(getAppliedSynergies(actions), [{ id: `${firstId}+${secondId}`, actionIds: [firstId, secondId], districtId: "nura", impact: { [metric]: 2 } }]);
    const result = applyImpacts(districts, actions);
    const expected = districts[4].metrics[metric] + actions.reduce((sum, action) => sum + (action.impact[metric] ?? 0) * calculateRealizedShare(action), 0) + 2;
    close(result[4].metrics[metric], expected);
    assert.deepEqual(getAppliedSynergies(actions.slice(0, 1)), []);
  }
});

test("strictly below 40 is critical, including the negative M11 road effect", () => {
  const after = createSnapshot(applyImpacts(districts, [selected("M11", "almaty")]));
  assert.equal(after.criticalCount, 3);
  assert.ok(after.criticalIndicators.some((indicator) => indicator.districtId === "almaty" && indicator.metric === "T1" && indicator.value === 38.25));
  const fixture = structuredClone(districts);
  fixture[4].metrics.S1 = 40;
  fixture[4].metrics.S2 = 39.999;
  assert.equal(createSnapshot(fixture).criticalCount, 1);
});

test("exactly five choices, exactly one per category, and no duplicate measures are enforced", () => {
  hasIssue(reference.slice(0, 4), "DECISION_COUNT");
  hasIssue([...reference, { actionId: "M14" }], "DECISION_COUNT");
  hasIssue([...reference.slice(0, 4), { actionId: "M7", districtId: "esil" }], "DUPLICATE_ACTION");
  hasIssue([...reference.slice(0, 4), { actionId: "M9", districtId: "esil" }], "CATEGORY_LIMIT");
  const cheapest = ["M9", "M11", "M10", "M12", "M4"].map((id) => ({ actionId: id, ...(id === "M12" ? {} : { districtId: "nura" }) }));
  const validation = validateSelection(cheapest, catalog, districts);
  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some((issue) => issue.code === "CATEGORY_REQUIRED"));
  assert.ok(validation.issues.some((issue) => issue.code === "CATEGORY_LIMIT"));
  assert.equal(validation.totalCost, 61);
  assert.deepEqual(Object.values(validateSelection(reference, catalog, districts).categoryCounts), [1, 1, 1, 1, 1]);
  assert.equal(Object.values(validation.categoryCounts).filter((count) => count > 0).length, 4);
});

test("decision shape, unknown identifiers, district requirements and cost spoofing are rejected", () => {
  for (const input of [null, {}, "M12", ["M12"], [1], [{ actionId: "M12", cost: 0 }], [{ actionId: "M12", impact: {} }], [{ actionId: "M12", districtId: null }], [{ actionId: "M12", districtId: undefined }]]) hasIssue(input, "INVALID_SELECTION");
  hasIssue([{ actionId: "unknown" }], "UNKNOWN_ACTION");
  hasIssue([{ actionId: "M7" }], "DISTRICT_REQUIRED");
  hasIssue([{ actionId: "M7", districtId: "" }], "DISTRICT_REQUIRED");
  hasIssue([{ actionId: "M7", districtId: "unknown" }], "UNKNOWN_DISTRICT");
  hasIssue([{ actionId: "M12", districtId: "nura" }], "UNEXPECTED_DISTRICT");
  hasIssue([{ actionId: "M12", districtId: "" }], "UNEXPECTED_DISTRICT");
});

test("global and same-district incompatibilities follow the source rules", () => {
  hasIssue([{ actionId: "M1", districtId: "esil" }, { actionId: "M3", districtId: "nura" }], "INCOMPATIBLE");
  for (const [first, second] of [["M4", "M7"], ["M5", "M13"]]) {
    hasIssue([{ actionId: first, districtId: "nura" }, { actionId: second, districtId: "nura" }], "INCOMPATIBLE");
    const different = validateSelection([{ actionId: first, districtId: "nura" }, { actionId: second, districtId: "esil" }], catalog, districts);
    assert.ok(!different.issues.some((issue) => issue.code === "INCOMPATIBLE"));
  }
});

test("exact budget passes and one extra unit fails with no calculated score", () => {
  const exact = catalog.map((action) => ({ ...action, cost: action.cost + (action.id === "M12" ? 7 : 0) }));
  assert.equal(simulateDecisions(districts, exact, reference).remainingBudget, 0);
  exact.find((action) => action.id === "M12")!.cost += 1;
  const validation = validateSelection(reference, exact, districts);
  assert.equal(validation.overBudgetBy, 1);
  assert.equal(validation.remainingBudget, -1);
  assert.throws(() => simulateDecisions(districts, exact, reference), SelectionValidationError);
  assert.equal(previewDecisions(districts, exact, reference), null);
});

test("partial previews permit incomplete categories but reject duplicate categories", () => {
  const baseline = previewDecisions(districts, catalog, [])!;
  assert.deepEqual(baseline.districts, districts);
  const partial = previewDecisions(districts, catalog, reference.slice(0, 2))!;
  assert.equal(partial.districts.find((district) => district.id === "nura")!.metrics.S1, 48);
  for (const preview of [baseline, partial]) {
    assert.deepEqual(Object.keys(preview).sort(), ["districts", "selectedActions", "synergies"]);
    assert.ok(!("score" in preview));
    assert.ok(!("after" in preview));
  }
  const complete = previewDecisions(districts, catalog, reference)!;
  assert.deepEqual(complete.districts, simulateDecisions(districts, catalog, reference).after.districts);
  assert.equal(previewDecisions(districts, catalog, [{ actionId: "M7" }]), null);
  assert.equal(previewDecisions(districts, catalog, [{ actionId: "M1", districtId: "nura" }, { actionId: "M3", districtId: "esil" }]), null);
  assert.equal(previewDecisions(districts, catalog, [...reference, { actionId: "M14" }]), null);
  assert.equal(previewDecisions(districts, catalog, null), null);
  assert.throws(() => simulateDecisions(districts, catalog, []), SelectionValidationError);
});

test("effects and synergy are summed before a single clamp, independent of action order", () => {
  const fixture: District[] = [{ ...districts[0], populationShare: 1, metrics: { ...districts[0].metrics, T1: 95, T2: 2 } }];
  const effects: SelectedAction[] = [
    { ...selected("M1", "esil"), lag: 0, impact: { T1: 20, T2: -20 } },
    { ...selected("M2"), lag: 0, impact: { T1: -15, T2: 5 } },
  ];
  const result = applyImpacts(fixture, effects);
  assert.equal(result[0].metrics.T1, 100); // 95 + 20 - 15 + 2 synergy, clipped once.
  assert.equal(result[0].metrics.T2, 0);
  assert.deepEqual(result, applyImpacts(fixture, [...effects].reverse()));
});

test("simulation is repeatable, order-independent, immutable and sensitive to target district", () => {
  const original = structuredClone({ districts, catalog, reference });
  const result = simulateDecisions(districts, catalog, reference);
  assert.deepEqual(result, simulateDecisions(districts, catalog, [...reference].reverse()));
  const changed = reference.map((decision) => decision.districtId === "nura" ? { ...decision, districtId: "esil" } : decision);
  assert.notEqual(result.after.score, simulateDecisions(districts, catalog, changed).after.score);
  result.before.districts[0].metrics.T1 = 0;
  result.after.districts[0].metrics.T1 = 0;
  result.selectedActions[0].impact.E2 = 999;
  assert.deepEqual({ districts, catalog, reference }, original);
});

test("invalid source inputs fail explicitly and final city formula receives no extra clipping", () => {
  assert.throws(() => createSnapshot([]));
  assert.throws(() => createSnapshot([districts[0], districts[0]]));
  assert.throws(() => createSnapshot([{ ...districts[0], populationShare: .5 }]));
  for (const value of [NaN, Infinity, -Infinity]) assert.throws(() => clampMetric(value));
  for (const value of [-1, 101, NaN]) assert.throws(() => calculateDistrictScore({ ...districts[0].metrics, T1: value }));
  for (const lag of [-1, 9, 1.5, NaN]) assert.throws(() => calculateRealizedShare({ lag }));
  assert.throws(() => applyImpacts(districts, [{ ...selected("M2"), impact: { T1: Infinity } }]));
  const zero: District = {
    ...districts[0], populationShare: 1,
    metrics: { T1: 0, T2: 0, E1: 0, E2: 0, S1: 0, S2: 0, B1: 0, B2: 0, C1: 0, C2: 0 },
  };
  assert.equal(createSnapshot([zero]).score, -10);
});
