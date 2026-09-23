import type { SimulationResult } from "../../types/index.ts";
import {
  CITY_BUDGET,
  DATASET_VERSION,
  HORIZON_QUARTERS,
  districts,
} from "../../data/districts.ts";
import { INDICATOR_IDS } from "../../data/indicators.ts";
import { validateDecisions } from "./validator.ts";

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const indicatorValues = (value: unknown, bounded = false): boolean =>
  object(value) &&
  INDICATOR_IDS.every(
    (id) =>
      finite(value[id]) && (!bounded || (value[id] >= 0 && value[id] <= 100)),
  );
const effectMap = (value: unknown): boolean =>
  object(value) &&
  Object.entries(value).every(
    ([key, amount]) =>
      (INDICATOR_IDS as readonly string[]).includes(key) && finite(amount),
  );

// Guard every field dereferenced by the results UI, including restored session data.
export function isSimulationResult(value: unknown): value is SimulationResult {
  if (
    !object(value) ||
    value.valid !== true ||
    value.datasetVersion !== DATASET_VERSION
  )
    return false;
  const validation = validateDecisions(value.decisions);
  if (
    !validation.valid ||
    value.budgetSpent !== validation.budgetSpent ||
    value.budgetRemaining !== CITY_BUDGET - validation.budgetSpent ||
    value.horizonQuarters !== HORIZON_QUARTERS
  )
    return false;
  if (
    !["initialScore", "finalScore", "delta"].every((key) => finite(value[key]))
  )
    return false;
  if (
    ![value.criticalBefore, value.criticalAfter].every(
      (v) => finite(v) && Number.isInteger(v) && v >= 0 && v <= 50,
    )
  )
    return false;
  for (const key of ["districtsBefore", "districtsAfter"]) {
    const snapshots = value[key];
    if (
      !object(snapshots) ||
      !districts.every((district) => {
        const snapshot = snapshots[district.id];
        return (
          object(snapshot) &&
          finite(snapshot.score) &&
          snapshot.populationShare === district.populationShare &&
          indicatorValues(snapshot.indicators, true)
        );
      })
    )
      return false;
  }
  const deltas = value.indicatorDeltas;
  if (!object(deltas) || !districts.every((d) => indicatorValues(deltas[d.id])))
    return false;
  if (
    !Array.isArray(value.appliedEffects) ||
    value.appliedEffects.length !== validation.decisions.length ||
    !value.appliedEffects.every(
      (effect) =>
        object(effect) &&
        typeof effect.measureId === "string" &&
        typeof effect.measureName === "string" &&
        finite(effect.cost) &&
        finite(effect.lag) &&
        finite(effect.factor) &&
        validation.decisions.some(
          (d) =>
            d.measureId === effect.measureId &&
            d.districtId === effect.districtId,
        ) &&
        effectMap(effect.effects),
    )
  )
    return false;
  if (
    !Array.isArray(value.synergies) ||
    !value.synergies.every(
      (synergy) =>
        object(synergy) &&
        Array.isArray(synergy.measureIds) &&
        synergy.measureIds.length === 2 &&
        synergy.measureIds.every(
          (id) =>
            typeof id === "string" &&
            validation.decisions.some((d) => d.measureId === id),
        ) &&
        districts.some((d) => d.id === synergy.districtId) &&
        effectMap(synergy.effects),
    )
  )
    return false;
  return true;
}
