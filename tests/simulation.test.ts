import assert from "node:assert/strict";
import test from "node:test";
import { districts } from "../src/data/districts.ts";
import { measures } from "../src/data/measures.ts";
import { INDICATOR_IDS } from "../src/data/indicators.ts";
import { simulate } from "../src/lib/simulation/simulate.ts";
import type { Decision, SimulationResult } from "../src/types/index.ts";

const sample: Decision[] = [
  { measureId: "M7", districtId: "nura" },
  { measureId: "M8", districtId: "nura" },
  { measureId: "M10", districtId: "nura" },
  { measureId: "M12", districtId: null },
  { measureId: "M5", districtId: "saryarka" },
];
const close = (actual: number, expected: number) => {
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
};
function run(decisions: unknown): SimulationResult {
  const result = simulate(decisions);
  assert.equal(result.valid, true, JSON.stringify(result));
  return result;
}

test("the source 95-unit example gives the independently verified score and exact deltas", () => {
  const result = run(sample);
  close(result.initialScore, 52.55768);
  close(result.finalScore, 56.54307);
  close(result.delta, 3.98539);
  assert.equal(result.budgetSpent, 95);
  assert.equal(result.budgetRemaining, 5);
  assert.equal(result.horizonQuarters, 8);
  assert.equal(result.datasetVersion, "astana-v1");
  assert.equal(result.criticalBefore, 2);
  assert.equal(result.criticalAfter, 0);
  assert.equal(result.districtsAfter.nura.indicators.S1, 48);
  assert.equal(result.districtsAfter.nura.indicators.S2, 43.75);
  assert.equal(result.districtsAfter.nura.indicators.B1, 67.5);
  assert.equal(result.districtsAfter.nura.indicators.B2, 51.75);
  assert.equal(result.districtsAfter.saryarka.indicators.E2, 48.75);
  assert.equal(result.districtsAfter.saryarka.indicators.C1, 47.5);
  assert.equal(result.indicatorDeltas.nura.S1, 10);
  assert.equal(result.indicatorDeltas.saryarka.E2, 8.75);
  assert.deepEqual(result.synergies, [
    { measureIds: ["M10", "M12"], districtId: "nura", effects: { B1: 2 } },
  ]);
});

test("city effects cover all five districts while local effects stay in the selected district", () => {
  const result = run(sample);
  for (const district of districts) {
    assert.equal(result.indicatorDeltas[district.id].C2, 4.375);
    assert.equal(
      result.indicatorDeltas[district.id].S1,
      district.id === "nura" ? 10 : 0,
    );
    assert.equal(
      result.indicatorDeltas[district.id].E2,
      district.id === "saryarka" ? 8.75 : 0,
    );
  }
});

test("the AI trace has one entry per measure, quarter factors and realized contributions", () => {
  const result = run(sample);
  assert.equal(result.appliedEffects.length, 5);
  assert.equal(
    result.appliedEffects.reduce((sum, effect) => sum + effect.cost, 0),
    95,
  );
  const school = result.appliedEffects.find(
    (effect) => effect.measureId === "M7",
  );
  assert.ok(school);
  assert.equal(school.lag, 3);
  assert.equal(school.factor, 0.625);
  assert.deepEqual(school.effects, { S1: 10 });
  assert.equal(school.districtId, "nura");
  const city = result.appliedEffects.find(
    (effect) => effect.measureId === "M12",
  );
  assert.equal(city?.districtId, null);
  assert.deepEqual(city?.effects, { C2: 4.375 });
});

test("the 61-unit plan is valid, retains its balance, and preserves the M11 transport tradeoff", () => {
  const result = run([
    { measureId: "M9", districtId: "nura" },
    { measureId: "M11", districtId: "nura" },
    { measureId: "M10", districtId: "nura" },
    { measureId: "M12", districtId: null },
    { measureId: "M4", districtId: "saryarka" },
  ]);
  assert.equal(result.budgetSpent, 61);
  assert.equal(result.budgetRemaining, 39);
  assert.equal(result.indicatorDeltas.nura.T1, -1.75);
  assert.equal(result.districtsAfter.nura.indicators.S1, 40.625);
  assert.equal(result.districtsAfter.nura.indicators.S2, 37.625);
  assert.equal(result.districtsAfter.nura.indicators.B1, 70.125);
  assert.equal(result.districtsAfter.nura.indicators.B2, 62.25);
  assert.equal(result.criticalAfter, 1);
  // An unused budget is reported, but never added as a score bonus.
  assert.ok(result.finalScore < run(sample).finalScore);
});

test("M1 + M2 bonus is fixed at two and belongs only to M1's district", () => {
  const result = run([
    { measureId: "M1", districtId: "almaty" },
    { measureId: "M2", districtId: null },
    { measureId: "M9", districtId: "nura" },
    { measureId: "M10", districtId: "nura" },
    { measureId: "M12", districtId: null },
  ]);
  assert.equal(result.indicatorDeltas.almaty.T1, 9.5);
  assert.equal(result.indicatorDeltas.nura.T1, 3);
  assert.equal(result.indicatorDeltas.almaty.T2, 6.75);
  assert.deepEqual(
    result.synergies.find((synergy) => synergy.measureIds[0] === "M1"),
    {
      measureIds: ["M1", "M2"],
      districtId: "almaty",
      effects: { T1: 2 },
    },
  );
});

test("M5 + M6 bonus stays in M5's district without being reduced by either lag", () => {
  const result = run([
    { measureId: "M5", districtId: "saryarka" },
    { measureId: "M6", districtId: null },
    { measureId: "M9", districtId: "nura" },
    { measureId: "M10", districtId: "nura" },
    { measureId: "M12", districtId: null },
  ]);
  assert.equal(result.indicatorDeltas.saryarka.E2, 12.25);
  assert.equal(result.indicatorDeltas.nura.E2, 1.5);
  assert.deepEqual(
    result.synergies.find((synergy) => synergy.measureIds[0] === "M5"),
    {
      measureIds: ["M5", "M6"],
      districtId: "saryarka",
      effects: { E2: 2 },
    },
  );
  const noPair = run(
    sample.map((decision) =>
      decision.measureId === "M12"
        ? { measureId: "M14", districtId: null }
        : decision,
    ),
  );
  assert.deepEqual(noPair.synergies, []);
  assert.equal(noPair.indicatorDeltas.nura.B1, 10.5);
});

test("order is irrelevant, runs always start from the baseline, and outputs do not alias source data", () => {
  const sourceBefore = structuredClone(districts);
  const measuresBefore = structuredClone(measures);
  const inputBefore = structuredClone(sample);
  const first = run(sample);
  assert.deepEqual(run([...sample].reverse()), first);
  const rotated = [...sample.slice(2), ...sample.slice(0, 2)];
  assert.deepEqual(run(rotated), first);
  assert.deepEqual(sample, inputBefore);
  assert.deepEqual(districts, sourceBefore);
  assert.deepEqual(measures, measuresBefore);
  first.districtsBefore.nura.indicators.S1 = 0;
  first.districtsAfter.nura.indicators.S1 = 0;
  first.decisions[0].districtId = "esil";
  first.appliedEffects[0].effects.E2 = 0;
  first.synergies[0].effects.B1 = 0;
  assert.deepEqual(run(sample), run(rotated));
  assert.equal(run(sample).districtsBefore.nura.indicators.S1, 38);
  assert.equal(run(sample).districtsAfter.nura.indicators.S1, 48);
});

test("changing strategy changes the score and every indicator delta matches the snapshots", () => {
  const original = run(sample);
  const redirected = run(
    sample.map((decision) =>
      decision.measureId === "M7"
        ? { ...decision, districtId: "esil" }
        : decision,
    ),
  );
  assert.notEqual(original.finalScore, redirected.finalScore);
  assert.equal(redirected.criticalAfter, 1);
  for (const result of [original, redirected]) {
    for (const district of districts) {
      for (const indicator of INDICATOR_IDS) {
        close(
          result.indicatorDeltas[district.id][indicator],
          result.districtsAfter[district.id].indicators[indicator] -
            result.districtsBefore[district.id].indicators[indicator],
        );
      }
    }
  }
});

test("invalid plans return reasons without any computed score or effects", () => {
  for (const input of [
    undefined,
    [],
    sample.slice(0, 4),
    [sample[0], sample[0], ...sample.slice(2)],
  ]) {
    const result = simulate(input);
    assert.equal(result.valid, false);
    if (result.valid) continue;
    assert.ok(result.errors.length);
    for (const key of [
      "initialScore",
      "finalScore",
      "delta",
      "appliedEffects",
    ]) {
      assert.equal(key in result, false);
    }
  }
});
