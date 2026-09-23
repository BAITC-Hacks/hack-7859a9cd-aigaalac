import assert from "node:assert/strict";
import test from "node:test";
import { buildCityVisualState } from "../lib/city-visuals.ts";
import { simulationRepository } from "../lib/data.ts";
import { applyImpacts } from "../lib/score.ts";
import type { SelectedAction } from "../lib/types.ts";

const districts = await simulationRepository.getDistricts();
const catalog = await simulationRepository.getActions();

function selected(actionId: string, districtId?: string): SelectedAction {
  const action = catalog.find((item) => item.id === actionId);
  assert.ok(action, `Missing test measure: ${actionId}`);
  return { ...action, impact: { ...action.impact }, ...(districtId === undefined ? {} : { districtId }) };
}

const featureKinds: Record<string, string> = {
  M1: "bus-lane", M2: "smart-signals", M3: "light-rail", M4: "park",
  M5: "clean-heating", M6: "green-belt", M7: "school", M8: "clinic",
  M9: "sports", M10: "street-lights", M11: "safe-crossing", M12: "service-hub",
  M13: "utility-pipes", M14: "emergency-hub",
};

test("all fourteen measures have distinct visual identities and obey their real district/city scope", () => {
  const observedKinds = new Set<string>();
  for (const action of catalog) {
    const decision = selected(action.id, action.scope === "district" ? "nura" : undefined);
    const after = applyImpacts(districts, [decision]);
    const state = buildCityVisualState(districts, after, [decision]);
    assert.equal(state.view, "after");
    assert.equal(state.actionCount, 1);
    assert.equal(state.featureCount, action.scope === "city" ? 5 : 1);
    const featureIds = new Set<string>();
    for (const district of state.districts) {
      const shouldApply = action.scope === "city" || district.id === "nura";
      assert.equal(district.features.length, shouldApply ? 1 : 0, `${action.id}/${district.id}`);
      assert.deepEqual(district.metrics, after.find((item) => item.id === district.id)!.metrics);
      assert.deepEqual(district.baseline, districts.find((item) => item.id === district.id)!.metrics);
      if (!shouldApply) {
        assert.deepEqual(district.metrics, district.baseline, "A local project must not change another district");
        continue;
      }
      const feature = district.features[0];
      assert.equal(feature.id, `${district.id}:${action.id}`);
      assert.equal(feature.actionId, action.id);
      assert.equal(feature.title, action.title);
      assert.equal(feature.scope, action.scope);
      assert.equal(feature.kind, featureKinds[action.id]);
      assert.ok(feature.description.trim().length > 0);
      assert.ok(feature.intensity > 0 && feature.intensity <= 1);
      featureIds.add(feature.id);
      observedKinds.add(feature.kind);
    }
    assert.equal(featureIds.size, state.featureCount, "Each district feature needs a stable unique identity");
  }
  assert.equal(observedKinds.size, 14);
});

test("moving and removing a school moves and removes the exact district feature and its metric effect", () => {
  const inNura = selected("M7", "nura");
  const nuraState = buildCityVisualState(districts, applyImpacts(districts, [inNura]), [inNura]);
  assert.equal(nuraState.districts.find((district) => district.id === "nura")!.metrics.S1, 48);
  assert.deepEqual(nuraState.districts.flatMap((district) => district.features.map((feature) => feature.id)), ["nura:M7"]);

  const inEsil = selected("M7", "esil");
  const moved = buildCityVisualState(districts, applyImpacts(districts, [inEsil]), [inEsil]);
  assert.deepEqual(moved.districts.flatMap((district) => district.features.map((feature) => feature.id)), ["esil:M7"]);
  assert.equal(moved.districts.find((district) => district.id === "esil")!.metrics.S1, 58);
  assert.equal(moved.districts.find((district) => district.id === "nura")!.metrics.S1, 38);

  const removed = buildCityVisualState(districts, districts, []);
  assert.equal(removed.actionCount, 0);
  assert.equal(removed.featureCount, 0);
  for (const district of removed.districts) {
    assert.deepEqual(district.features, []);
    assert.deepEqual(district.metrics, district.baseline);
  }
});

test("visuals preserve actual lag-adjusted metrics and synergy rather than applying effects a second time", () => {
  const actions = [selected("M7", "nura"), selected("M10", "nura"), selected("M12")];
  const after = applyImpacts(districts, actions);
  const state = buildCityVisualState(districts, after, actions);
  const nura = state.districts.find((district) => district.id === "nura")!;
  assert.equal(nura.metrics.S1, 48);
  assert.equal(nura.metrics.B1, 67.5); // Includes the unscaled M10 + M12 bonus exactly once.
  assert.equal(nura.metrics.C2, 54.375);
  assert.equal(nura.features.find((feature) => feature.actionId === "M7")!.intensity, 0.625);
  assert.equal(nura.features.find((feature) => feature.actionId === "M10")!.intensity, 0.875);
  assert.equal(state.actionCount, 3);
  assert.equal(state.featureCount, 7); // Two local features and one city feature in each of five districts.
  assert.equal(Object.hasOwn(state, "score"), false, "The visual adapter must not create a city score");
});

test("before view shows only the baseline while leaving the selected plan and both snapshots intact", () => {
  const actions = [selected("M7", "nura"), selected("M12")];
  const after = applyImpacts(districts, actions);
  const original = structuredClone({ districts, after, actions });
  const state = buildCityVisualState(districts, after, actions, "before");
  assert.equal(state.view, "before");
  assert.equal(state.actionCount, 0);
  assert.equal(state.featureCount, 0);
  for (const district of state.districts) {
    assert.deepEqual(district.metrics, original.districts.find((item) => item.id === district.id)!.metrics);
    assert.deepEqual(district.features, []);
  }
  state.districts[0].metrics.T1 = 0;
  state.districts[0].baseline.T2 = 0;
  assert.deepEqual({ districts, after, actions }, original);
  const restored = buildCityVisualState(districts, after, actions, "after");
  assert.equal(restored.featureCount, 6);
  assert.equal(restored.districts.find((district) => district.id === "nura")!.metrics.S1, 48);
});

test("greener and cleaner metrics affect the scene, while better traffic means less congestion", () => {
  const baseline = buildCityVisualState(districts, districts, []);
  const actions = [selected("M4", "nura"), selected("M2"), selected("M14")];
  const after = applyImpacts(districts, actions);
  const state = buildCityVisualState(districts, after, actions);
  const beforeNura = baseline.districts.find((district) => district.id === "nura")!;
  const afterNura = state.districts.find((district) => district.id === "nura")!;
  assert.ok(afterNura.treeCount > beforeNura.treeCount);
  assert.ok(afterNura.airQuality > beforeNura.airQuality);
  assert.ok(afterNura.trafficLevel < beforeNura.trafficLevel);
  assert.ok(afterNura.serviceQuality > beforeNura.serviceQuality);
  for (const district of state.districts) {
    assert.ok(Number.isInteger(district.treeCount) && district.treeCount >= 4);
    for (const level of [district.trafficLevel, district.airQuality, district.serviceQuality])
      assert.ok(level >= 0 && level <= 1);
    assert.equal(district.populationShare, districts.find((item) => item.id === district.id)!.populationShare);
  }
});

test("visual states are repeatable, keyed by district IDs, and detached from source snapshots", () => {
  const actions = [selected("M7", "nura"), selected("M12")];
  const after = applyImpacts(districts, actions);
  const original = structuredClone({ districts, after, actions });
  const first = buildCityVisualState(districts, after, actions);
  assert.deepEqual(first, buildCityVisualState(districts, after, actions));
  assert.deepEqual(first, buildCityVisualState(districts, [...after].reverse(), actions));
  const reversed = buildCityVisualState(districts, after, [...actions].reverse());
  const identities = (state: typeof first) => state.districts.flatMap((district) => district.features.map((feature) => feature.id)).sort();
  assert.deepEqual(identities(first), identities(reversed));
  first.districts[0].metrics.C2 = 0;
  first.districts[0].baseline.C1 = 0;
  first.districts[0].features[0].title = "Changed only in returned scene";
  assert.deepEqual({ districts, after, actions }, original);
});

test("the visual adapter rejects invented, missing and inappropriate district targets", () => {
  const invalid: SelectedAction[][] = [
    [selected("M7")],
    [selected("M7", "unknown-district")],
    [selected("M12", "nura")],
    [{ ...selected("M7", "nura"), id: "M404" }],
  ];
  for (const actions of invalid) {
    assert.throws(() => buildCityVisualState(districts, districts, actions));
  }
  assert.throws(() => buildCityVisualState(districts, districts.slice(1), []));
});
