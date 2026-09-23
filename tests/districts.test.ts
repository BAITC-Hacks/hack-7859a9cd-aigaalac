import assert from "node:assert/strict";
import test from "node:test";
import { simulationRepository } from "../lib/data.ts";
import { buildDistrictReports, summarizeDistricts } from "../lib/districts.ts";
import { applyImpacts, METRIC_KEYS, METRIC_WEIGHTS, simulateDecisions } from "../lib/score.ts";
import type { Decision, SelectedAction } from "../lib/types.ts";

const districts = await simulationRepository.getDistricts();
const catalog = await simulationRepository.getActions();
const plan: Decision[] = [
  { actionId: "M7", districtId: "nura" }, { actionId: "M1", districtId: "nura" },
  { actionId: "M10", districtId: "nura" }, { actionId: "M12" }, { actionId: "M5", districtId: "saryarka" },
];
const result = simulateDecisions(districts, catalog, plan);
function close(actual: number, expected: number): void { assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`); }

test("district reports match IDs, scope, realized effects, fixed synergy and actual snapshots", () => {
  const reports = buildDistrictReports(result.before.districts, [...result.after.districts].reverse(), result.selectedActions);
  assert.equal(reports.length, 5);
  const nura = reports.find((report) => report.id === "nura")!;
  const esil = reports.find((report) => report.id === "esil")!;
  assert.equal(nura.initialPriority, "S2");
  assert.equal(nura.remainingPriority, "S2");
  assert.equal(nura.populationShare, .16);
  assert.equal(nura.actionEffects.length, 4);
  assert.deepEqual(esil.actionEffects.map((effect) => effect.id), ["M12"]);
  assert.deepEqual(esil.synergies, []);
  assert.equal(nura.synergies[0].id, "M10+M12");
  assert.equal(nura.actionEffects.find((effect) => effect.id === "M10")!.impact.B1, 10.5);
  assert.equal(nura.metricChanges.B1, 12.5);
  assert.equal(nura.actionEffects.find((effect) => effect.id === "M7")!.realizedShare, .625);
  for (const report of reports) {
    const final = result.after.districts.find((district) => district.id === report.id)!;
    assert.deepEqual(report.after, final.metrics);
    close(report.metricChanges.C2, 4.375);
    assert.equal(report.clamped, false);
    const contribution = report.actionEffects.reduce((sum, effect) => sum + effect.scoreContribution, 0)
      + report.synergies.reduce((sum, bonus) => sum + METRIC_KEYS.reduce((subtotal, key) => subtotal + (bonus.impact[key] ?? 0) * METRIC_WEIGHTS[key], 0), 0);
    close(contribution, report.scoreChange);
  }
  nura.before.T1 = 0;
  nura.after.T1 = 0;
  nura.actionEffects[0].impact.S1 = 999;
  assert.equal(result.before.districts[4].metrics.T1, 55);
  assert.equal(result.after.districts[4].metrics.T1, 59.5);
  assert.equal(catalog.find((action) => action.id === "M7")!.impact.S1, 16);
});

test("district summaries preserve unrounded gains and identify final remaining need", () => {
  const reports = buildDistrictReports(districts, result.after.districts, result.selectedActions);
  const summary = summarizeDistricts(reports);
  assert.equal(summary.mostImproved.id, "nura");
  assert.equal(summary.needsAttention.id, "nura");
  close(summary.gapBefore, 13.81);
  close(summary.gapAfter, 10.3025);
  close(summary.mostImproved.scoreChange, 3.945);
  close(summary.needsAttention.afterScore, 53.125);
});

test("empty-action reports explain baseline and capped contributions remain separate", () => {
  const baseline = buildDistrictReports(districts, districts, []);
  assert.ok(baseline.every((report) => report.scoreChange === 0 && report.actionEffects.length === 0 && report.synergies.length === 0));
  const exaggerated: SelectedAction = { ...catalog.find((action) => action.id === "M2")!, lag: 0, impact: { T1: 200, C1: -200 } };
  const reports = buildDistrictReports(districts, applyImpacts(districts, [exaggerated]), [exaggerated]);
  for (const report of reports) {
    assert.equal(report.clamped, true);
    assert.equal(report.after.T1, 100);
    assert.equal(report.after.C1, 0);
    assert.equal(report.actionEffects[0].impact.T1, 200);
    assert.equal(report.actionEffects[0].impact.C1, -200);
  }
});

test("missing, duplicate or mismatched district snapshots are rejected", () => {
  assert.throws(() => buildDistrictReports(districts, result.after.districts.slice(1), result.selectedActions));
  assert.throws(() => buildDistrictReports(districts, [result.after.districts[0], ...result.after.districts.slice(0, 4)], result.selectedActions));
  const wrong = structuredClone(result.after.districts);
  wrong[0].id = "unknown";
  assert.throws(() => buildDistrictReports(districts, wrong, result.selectedActions));
  assert.throws(() => summarizeDistricts([]));
});
