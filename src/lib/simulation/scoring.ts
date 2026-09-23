import type {
  District,
  IndicatorCode,
} from "@/types/district";

import {
  CRITICAL_THRESHOLD,
  INDICATOR_WEIGHTS,
} from "./constants";

export function calculateSimulationDistrictscore(
  district: District
): number {
  let score = 0;

  for (const [indicator, weight] of Object.entries(
    INDICATOR_WEIGHTS
  ) as [IndicatorCode, number][]) {
    score += district.indicators[indicator] * weight;
  }

  return score;
}

export function calculateAllSimulationDistrictscores(
  simulationdistricts: Record<string, District>
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(simulationdistricts).map(
      ([districtId, district]) => [
        districtId,
        calculateSimulationDistrictscore(district),
      ]
    )
  );
}

export function calculateCityAverage(
  simulationdistricts: Record<string, District>,
  simulationDistrictscores: Record<string, number>
): number {
  return Object.entries(simulationdistricts).reduce(
    (sum, [districtId, district]) => {
      return (
        sum +
        district.populationWeight *
          simulationDistrictscores[districtId]
      );
    },
    0
  );
}

export function countCriticalIndicators(
  simulationdistricts: Record<string, District>
): number {
  let count = 0;

  for (const district of Object.values(simulationdistricts)) {
    for (const value of Object.values(
      district.indicators
    ) as number[]) {
      if (value < CRITICAL_THRESHOLD) {
        count++;
      }
    }
  }

  return count;
}

export function calculateQualityOfLifeScore(
  simulationdistricts: Record<string, District>
): {
  score: number;
  cityAverage: number;
  weakestSimulationDistrictscore: number;
  simulationDistrictscores: Record<string, number>;
  criticalCount: number;
} {
  const simulationDistrictscores =
    calculateAllSimulationDistrictscores(simulationdistricts);

  const cityAverage = calculateCityAverage(
    simulationdistricts,
    simulationDistrictscores
  );

  const weakestSimulationDistrictscore = Math.min(
    ...Object.values(simulationDistrictscores)
  );

  const criticalCount =
    countCriticalIndicators(simulationdistricts);

  const score =
    0.7 * cityAverage +
    0.3 * weakestSimulationDistrictscore -
    criticalCount;

  return {
    score,
    cityAverage,
    weakestSimulationDistrictscore,
    simulationDistrictscores,
    criticalCount,
  };
}