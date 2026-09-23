import assert from "node:assert/strict";
import test from "node:test";
import { districts } from "../src/data/districts.ts";
import { INDICATOR_IDS, INDICATOR_WEIGHTS } from "../src/data/indicators.ts";
import { applyIndicatorChanges } from "../src/lib/simulation/effects.ts";
import {
  calculateCityScore,
  calculateDistrictScore,
} from "../src/lib/simulation/scoring.ts";
import type { DistrictSnapshot, Indicators } from "../src/types/index.ts";

const close = (actual: number, expected: number) => {
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
};
const uniform = (value: number): Indicators =>
  Object.fromEntries(INDICATOR_IDS.map((id) => [id, value])) as Indicators;

test("district scoring applies each indicator weight independently", () => {
  for (const id of INDICATOR_IDS) {
    close(
      calculateDistrictScore({ ...uniform(0), [id]: 100 }),
      INDICATOR_WEIGHTS[id] * 100,
    );
  }
});

test("fixed baseline city score preserves precision and penalizes both Nura social indicators", () => {
  const baseline = Object.fromEntries(
    districts.map((district) => [district.id, district]),
  );
  const result = calculateCityScore(baseline);
  close(result.score, 52.55768);
  close(result.averageScore, 56.8624);
  close(result.minimumScore, 49.18);
  assert.equal(result.criticalCount, 2);
  for (const [id, expected] of Object.entries({
    esil: 62.99,
    almaty: 57.06,
    saryarka: 54.65,
    baikonur: 56.63,
    nura: 49.18,
  })) {
    close(calculateDistrictScore(baseline[id].indicators), expected);
  }
});

test("city score uses population weighting and the weakest district", () => {
  const city: Record<string, DistrictSnapshot> = {
    big: { score: 0, populationShare: 0.9, indicators: uniform(80) },
    small: { score: 0, populationShare: 0.1, indicators: uniform(50) },
  };
  const score = calculateCityScore(city);
  close(score.averageScore, 77);
  close(score.minimumScore, 50);
  close(score.score, 68.9);
  // Stale display scores cannot override scores derived from indicators.
  assert.equal(score.criticalCount, 0);
});

test("critical values are counted per district and indicator, strictly below forty", () => {
  const atThreshold = {
    only: { score: 40, populationShare: 1, indicators: uniform(40) },
  };
  assert.equal(calculateCityScore(atThreshold).criticalCount, 0);
  const oneBelow = {
    first: {
      score: 40,
      populationShare: 0.5,
      indicators: { ...uniform(40), S1: 39.999 },
    },
    second: {
      score: 40,
      populationShare: 0.5,
      indicators: { ...uniform(40), S1: 39.999, S2: 39.999 },
    },
  };
  assert.equal(calculateCityScore(oneBelow).criticalCount, 3);
});

test("indicator clipping happens once after positive and negative contributions are summed", () => {
  const source = uniform(50);
  source.T1 = 99;
  source.T2 = 1;
  const original = structuredClone(source);
  const changes = [
    { T1: 10, T2: -8 },
    { T1: -5, T2: 5 },
  ];
  const result = applyIndicatorChanges(source, changes);
  assert.equal(result.T1, 100);
  assert.equal(result.T2, 0);
  assert.equal(result.S1, 50);
  assert.deepEqual(
    applyIndicatorChanges(source, [...changes].reverse()),
    result,
  );
  assert.deepEqual(source, original);
});
