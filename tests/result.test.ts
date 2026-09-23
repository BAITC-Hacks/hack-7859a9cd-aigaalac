import test from "node:test";
import assert from "node:assert/strict";
import { mockResult } from "../src/data/mockResults.ts";
import { isSimulationResult } from "../src/lib/simulation/result.ts";

test("complete calculated result is accepted for API and session restoration", () => {
  assert.equal(isSimulationResult(mockResult), true);
});

test("obsolete or malformed session results are rejected before rendering", () => {
  for (const patch of [
    { datasetVersion: "old-demo" },
    { indicatorDeltas: {} },
    { indicatorDeltas: null },
    { appliedEffects: [null] },
    { synergies: [{ measureIds: null }] },
    { decisions: [] },
    { budgetSpent: 0 },
    { criticalAfter: -1 },
    { districtsAfter: { ...mockResult.districtsAfter, nura: { score: 99 } } },
  ])
    assert.equal(
      isSimulationResult({ ...mockResult, ...patch }),
      false,
      JSON.stringify(patch),
    );
});
