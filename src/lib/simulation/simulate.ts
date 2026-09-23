import {
  CITY_BUDGET,
  DATASET_VERSION,
  HORIZON_QUARTERS,
  districts,
} from "../../data/districts.ts";
import { INDICATOR_IDS } from "../../data/indicators.ts";
import type {
  DistrictSnapshot,
  Indicators,
  SimulationResult,
} from "../../types/index.ts";
import { applyEffects, applyIndicatorChanges } from "./effects.ts";
import { calculateCityScore, calculateDistrictScore } from "./scoring.ts";
import { getAppliedSynergies } from "./synergies.ts";
import { validateDecisions } from "./validator.ts";

/** Every run starts from the same immutable dataset and only accepts valid complete plans. */
export function simulate(
  input: unknown,
): SimulationResult | { valid: false; errors: string[] } {
  const validation = validateDecisions(input);
  if (!validation.valid) return validation;

  const appliedEffects = applyEffects(validation.decisions);
  const synergies = getAppliedSynergies(validation.decisions);
  const districtsBefore: Record<string, DistrictSnapshot> = {};
  const districtsAfter: Record<string, DistrictSnapshot> = {};
  const indicatorDeltas: Record<string, Indicators> = {};

  for (const district of districts) {
    const before = { ...district.indicators };
    const effects = appliedEffects
      .filter(
        (effect) =>
          effect.districtId === null || effect.districtId === district.id,
      )
      .map((effect) => effect.effects);
    const bonuses = synergies
      .filter((synergy) => synergy.districtId === district.id)
      .map((synergy) => synergy.effects);
    const after = applyIndicatorChanges(before, [...effects, ...bonuses]);
    districtsBefore[district.id] = {
      score: calculateDistrictScore(before),
      indicators: before,
      populationShare: district.populationShare,
    };
    districtsAfter[district.id] = {
      score: calculateDistrictScore(after),
      indicators: after,
      populationShare: district.populationShare,
    };
    const deltas = { ...before };
    for (const indicator of INDICATOR_IDS) {
      deltas[indicator] = after[indicator] - before[indicator];
    }
    indicatorDeltas[district.id] = deltas;
  }

  const initial = calculateCityScore(districtsBefore);
  const final = calculateCityScore(districtsAfter);
  return {
    valid: true,
    decisions: validation.decisions,
    budgetSpent: validation.budgetSpent,
    budgetRemaining: CITY_BUDGET - validation.budgetSpent,
    horizonQuarters: HORIZON_QUARTERS,
    datasetVersion: DATASET_VERSION,
    initialScore: initial.score,
    finalScore: final.score,
    delta: final.score - initial.score,
    criticalBefore: initial.criticalCount,
    criticalAfter: final.criticalCount,
    districtsBefore,
    districtsAfter,
    indicatorDeltas,
    appliedEffects,
    synergies,
  };
}
