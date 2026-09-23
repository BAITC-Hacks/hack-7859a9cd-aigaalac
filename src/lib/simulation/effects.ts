import { simulationSimulationMeasures } from "@/data/engineMeasures";
import type {
  District,
  IndicatorCode,
} from "@/types/district";

import type {
  AppliedEffect,
  Decision,
} from "@/types/simulation";

import { HORIZON } from "./constants";

export function clamp(
  value: number,
  min = 0,
  max = 100
): number {
  return Math.min(max, Math.max(min, value));
}

export function calculateRealizedEffect(
  fullEffect: number,
  lag: number
): number {
  return fullEffect * ((HORIZON - lag) / HORIZON);
}

export function cloneSimulationDistricts(
  source: District[]
): Record<string, District> {
  return Object.fromEntries(
    source.map((district) => [
      district.id,
      {
        ...district,
        indicators: {
          ...district.indicators,
        },
      },
    ])
  );
}

export function applyDecision(
  state: Record<string, District>,
  decision: Decision
): AppliedEffect[] {
  const measure = Object.values(simulationSimulationMeasures).find(
    (item) => item.id === decision.measureId
  );

  if (!measure) {
    return [];
  }

  const appliedEffects: AppliedEffect[] = [];

  const targetDistrictIds =
    measure.type === "city"
      ? Object.keys(state)
      : decision.districtId
        ? [decision.districtId]
        : [];

  for (const districtId of targetDistrictIds) {
    const district = state[districtId];

    if (!district) continue;

    for (const [indicator, fullEffect] of Object.entries(
      measure.effects
    ) as [IndicatorCode, number][]) {
      const realizedEffect = calculateRealizedEffect(
        fullEffect,
        measure.lag
      );

      const before = district.indicators[indicator];

      const after = clamp(
        before + realizedEffect
      );

      district.indicators[indicator] = after;

      appliedEffects.push({
        measureId: measure.id,
        districtId,
        indicator,
        fullEffect,
        lag: measure.lag,
        realizedEffect,
        before,
        after,
      });
    }
  }

  return appliedEffects;
}
