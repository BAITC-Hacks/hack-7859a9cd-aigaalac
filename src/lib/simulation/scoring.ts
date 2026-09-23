import { INDICATOR_IDS, INDICATOR_WEIGHTS } from "../../data/indicators.ts";
import type { DistrictSnapshot, Indicators } from "../../types/index.ts";

export function calculateDistrictScore(indicators: Indicators): number {
  return INDICATOR_IDS.reduce(
    (score, indicator) =>
      score + INDICATOR_WEIGHTS[indicator] * indicators[indicator],
    0,
  );
}

export function calculateCityScore(
  districts: Record<string, DistrictSnapshot>,
): {
  score: number;
  averageScore: number;
  minimumScore: number;
  criticalCount: number;
} {
  const snapshots = Object.values(districts);
  if (!snapshots.length)
    throw new Error("Cannot score a city without districts.");

  let averageScore = 0;
  let minimumScore = Infinity;
  let criticalCount = 0;
  for (const district of snapshots) {
    const score = calculateDistrictScore(district.indicators);
    averageScore += district.populationShare * score;
    minimumScore = Math.min(minimumScore, score);
    criticalCount += INDICATOR_IDS.filter(
      (indicator) => district.indicators[indicator] < 40,
    ).length;
  }
  return {
    score: 0.7 * averageScore + 0.3 * minimumScore - criticalCount,
    averageScore,
    minimumScore,
    criticalCount,
  };
}
