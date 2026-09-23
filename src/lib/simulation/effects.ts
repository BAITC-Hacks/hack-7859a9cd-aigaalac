import { HORIZON_QUARTERS } from "../../data/districts.ts";
import { INDICATOR_IDS } from "../../data/indicators.ts";
import { measures } from "../../data/measures.ts";
import type {
  Decision,
  Indicators,
  SimulationResult,
} from "../../types/index.ts";

/** One trace entry per measure; a null district applies to every district. */
export function applyEffects(
  decisions: Decision[],
): SimulationResult["appliedEffects"] {
  return decisions.map((decision) => {
    const measure = measures.find((entry) => entry.id === decision.measureId);
    if (!measure) throw new Error(`Unknown measure: ${decision.measureId}`);
    const factor = (HORIZON_QUARTERS - measure.lag) / HORIZON_QUARTERS;
    const effects: Partial<Indicators> = {};
    for (const indicator of INDICATOR_IDS) {
      const effect = measure.effects[indicator];
      if (effect !== undefined) effects[indicator] = effect * factor;
    }
    return {
      measureId: measure.id,
      measureName: measure.name,
      cost: measure.cost,
      lag: measure.lag,
      factor,
      districtId: decision.districtId,
      effects,
    };
  });
}

/** Sum all effects and fixed bonuses first, then clip exactly once. */
export function applyIndicatorChanges(
  baseline: Indicators,
  changes: Partial<Indicators>[],
): Indicators {
  const indicators = { ...baseline };
  for (const indicator of INDICATOR_IDS) {
    const delta = changes.reduce(
      (sum, change) => sum + (change[indicator] ?? 0),
      0,
    );
    indicators[indicator] = Math.max(
      0,
      Math.min(100, baseline[indicator] + delta),
    );
  }
  return indicators;
}
