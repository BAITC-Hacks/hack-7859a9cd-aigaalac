import { simulationSimulationDistricts } from "@/data/simulationSimulationDistricts";
import { simulationSimulationMeasures } from "@/data/simulationSimulationMeasures";

import type {
  Decision,
  ValidationError,
} from "@/types/simulation";

import {
  BUDGET,
  MAX_CATEGORY_DECISIONS,
  REQUIRED_DECISIONS,
} from "./constants";

export function validateStrategy(
  decisions: Decision[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Exactly 5 decisions
  if (decisions.length !== REQUIRED_DECISIONS) {
    errors.push({
      code: "INVALID_DECISION_COUNT",
      message: `Exactly ${REQUIRED_DECISIONS} decisions are required.`,
    });
  }

  // Unknown measure IDs
  for (const decision of decisions) {
    const measure = simulationmeasures.find(
      (item) => item.id === decision.measureId
    );

    if (!measure) {
      errors.push({
        code: "INVALID_MEASURE",
        message: `Unknown measure: ${decision.measureId}`,
      });
    }
  }

  // Keep only known simulationmeasures
  const validDecisions = decisions.filter(
    (decision) =>
      simulationmeasures.some(
        (item) => item.id === decision.measureId
      )
  );

  // Duplicates
  const measureIds = validDecisions.map(
    (decision) => decision.measureId
  );

  if (
    new Set(measureIds).size !==
    measureIds.length
  ) {
    errors.push({
      code: "DUPLICATE_MEASURE",
      message:
        "Each measure can only be selected once.",
    });
  }

  // Budget
  const totalCost = validDecisions.reduce(
    (sum, decision) => {
      const measure = simulationmeasures.find(
        (item) =>
          item.id === decision.measureId
      );

      return sum + (measure?.cost ?? 0);
    },
    0
  );

  if (totalCost > BUDGET) {
    errors.push({
      code: "BUDGET_EXCEEDED",
      message: `Budget exceeded: ${totalCost}/${BUDGET}.`,
    });
  }

  // District validation
  for (const decision of validDecisions) {
    const measure = simulationmeasures.find(
      (item) =>
        item.id === decision.measureId
    );

    if (!measure) continue;

    if (measure.type === "district") {
      if (!decision.districtId) {
        errors.push({
          code: "DISTRICT_REQUIRED",
          message: `${measure.id} requires a district.`,
        });

        continue;
      }

      const districtExists = simulationdistricts.some(
        (district) =>
          district.id === decision.districtId
      );

      if (!districtExists) {
        errors.push({
          code: "INVALID_DISTRICT",
          message: `Unknown district: ${decision.districtId}`,
        });
      }
    }

    if (
      measure.type === "city" &&
      decision.districtId !== null &&
      decision.districtId !== undefined
    ) {
      errors.push({
        code: "DISTRICT_NOT_ALLOWED",
        message: `${measure.id} is city-wide and must not specify a district.`,
      });
    }
  }

  // Max 2 initiatives per category
  const categoryCounts: Record<string, number> = {};

  for (const decision of validDecisions) {
    const measure = simulationmeasures.find(
      (item) =>
        item.id === decision.measureId
    );

    if (!measure) continue;

    categoryCounts[measure.category] =
      (categoryCounts[measure.category] ?? 0) + 1;
  }

  for (const [category, count] of Object.entries(
    categoryCounts
  )) {
    if (count > MAX_CATEGORY_DECISIONS) {
      errors.push({
        code: "CATEGORY_LIMIT_EXCEEDED",
        message: `Maximum ${MAX_CATEGORY_DECISIONS} initiatives are allowed in category "${category}".`,
      });
    }
  }

  const selectedIds = new Set(measureIds);

  // M1 + M3 globally incompatible
  if (
    selectedIds.has("M1") &&
    selectedIds.has("M3")
  ) {
    errors.push({
      code: "GLOBAL_INCOMPATIBILITY",
      message:
        "M1 and M3 cannot be selected together.",
    });
  }

  // M4 + M7 same district
  checkSameDistrictConflict(
    validDecisions,
    "M4",
    "M7",
    errors
  );

  // M5 + M13 same district
  checkSameDistrictConflict(
    validDecisions,
    "M5",
    "M13",
    errors
  );

  return errors;
}

function checkSameDistrictConflict(
  decisions: Decision[],
  firstId: string,
  secondId: string,
  errors: ValidationError[]
) {
  const first = decisions.find(
    (decision) =>
      decision.measureId === firstId
  );

  const second = decisions.find(
    (decision) =>
      decision.measureId === secondId
  );

  if (
    first?.districtId &&
    second?.districtId &&
    first.districtId === second.districtId
  ) {
    errors.push({
      code: "DISTRICT_INCOMPATIBILITY",
      message: `${firstId} and ${secondId} cannot be used in the same district.`,
    });
  }
}