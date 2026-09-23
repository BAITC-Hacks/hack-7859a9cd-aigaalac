import type { AIAnalysis, SimulationResult } from "../../types/index.ts";
import { districts } from "../../data/districts.ts";
import { INDICATOR_IDS, INDICATOR_LABELS } from "../../data/indicators.ts";

// Optional key-free preview, explicitly labelled as a rules-based summary in UI.
export function describeResult(result: SimulationResult): AIAnalysis {
  const critical = districts.flatMap((d) =>
    INDICATOR_IDS.filter(
      (key) => result.districtsAfter[d.id].indicators[key] < 40,
    ).map(
      (key) =>
        `${d.name}: ${key} ${INDICATOR_LABELS[key]} = ${result.districtsAfter[d.id].indicators[key]}`,
    ),
  );
  const weakest = [...districts].sort(
    (a, b) =>
      result.districtsAfter[a.id].score - result.districtsAfter[b.id].score,
  )[0];
  const negative = districts.flatMap((d) =>
    INDICATOR_IDS.filter((key) => result.indicatorDeltas[d.id][key] < 0).map(
      (key) =>
        `${d.name}: ${key} changes by ${result.indicatorDeltas[d.id][key]}.`,
    ),
  );
  return {
    summary: `Rules-based preview, not AI. This strategy spends ${result.budgetSpent}/100 credits and changes the score from ${result.initialScore.toFixed(2)} to ${result.finalScore.toFixed(2)} after ${result.horizonQuarters} quarters.`,
    strengths: [
      `Critical indicators: ${result.criticalBefore} before, ${result.criticalAfter} after.`,
      ...result.synergies.map(
        (s) =>
          `Synergy ${s.measureIds.join(" + ")} applies in ${districts.find((d) => d.id === s.districtId)?.name}.`,
      ),
    ],
    risks: critical.length
      ? critical
      : ["No indicators remain below 40 in this scenario."],
    tradeoffs: negative.length
      ? negative
      : [
          "Full measure effects are reduced by their implementation lag over the eight-quarter horizon.",
        ],
    recommendation: `Review ${weakest.name}, the lowest-scoring district (${result.districtsAfter[weakest.id].score.toFixed(2)}), before comparing another strategy.`,
  };
}
