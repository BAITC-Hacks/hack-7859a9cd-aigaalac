import { simulationdistricts } from "@/data/simulationdistricts";
import { simulationmeasures } from "@/data/simulationmeasures";

import type {
  Decision,
  SimulationResult,
} from "@/types/simulation";

import { BUDGET } from "./constants";

import {
  applyDecision,
  cloneSimulationDistricts,
} from "./effects";

import { applySynergies } from "./synergies";

import {
  calculateQualityOfLifeScore,
} from "./scoring";

import { validateStrategy } from "./validator";

export function simulateStrategy(
  decisions: Decision[]
): SimulationResult {
  // 1. Validate
  const validationErrors =
    validateStrategy(decisions);

  if (validationErrors.length > 0) {
    return {
      valid: false,
      validationErrors,
    };
  }

  // 2. Clone baseline data
  const simulationdistrictsBefore =
    cloneSimulationDistricts(simulationdistricts);

  const simulationdistrictsAfter =
    cloneSimulationDistricts(simulationdistricts);

  // 3. Baseline score
  const baseline =
    calculateQualityOfLifeScore(
      simulationdistrictsBefore
    );

  // 4. Budget
  const spent = decisions.reduce(
    (sum, decision) => {
      const measure = simulationmeasures.find(
        (item) =>
          item.id === decision.measureId
      );

      return sum + (measure?.cost ?? 0);
    },
    0
  );

  // 5. Apply measure effects
  const appliedEffects = decisions.flatMap(
    (decision) =>
      applyDecision(
        simulationdistrictsAfter,
        decision
      )
  );

  // 6. Apply synergy bonuses
  const activatedSynergies =
    applySynergies(
      simulationdistrictsAfter,
      decisions
    );

  // 7. Calculate final score
  const finalResult =
    calculateQualityOfLifeScore(
      simulationdistrictsAfter
    );

  return {
    valid: true,

    validationErrors: [],

    budget: {
      total: BUDGET,
      spent,
      remaining: BUDGET - spent,
    },

    score: {
      initial: baseline.score,
      final: finalResult.score,
      delta:
        finalResult.score -
        baseline.score,
    },

    criticalIndicators: {
      before: baseline.criticalCount,
      after: finalResult.criticalCount,
    },

    simulationdistrictsBefore,
    simulationdistrictsAfter,

    simulationDistrictscoresBefore:
      baseline.simulationDistrictscores,

    simulationDistrictscoresAfter:
      finalResult.simulationDistrictscores,

    selectedSimulationMeasures: decisions,

    appliedEffects,

    activatedSynergies,
  };
}