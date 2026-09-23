import {
  CITY_BUDGET,
  DECISION_LIMIT,
  MAX_PER_CATEGORY,
  districts,
} from "../../data/districts.ts";
import { incompatibilities } from "../../data/incompatibilities.ts";
import { measures } from "../../data/measures.ts";
import type { Decision } from "../../types/index.ts";

export type ValidationResult =
  | { valid: true; decisions: Decision[]; budgetSpent: number }
  | { valid: false; errors: string[] };

/** Validate the untrusted decisions, deriving costs and scope only from the dataset. */
export function validateDecisions(
  input: unknown,
  options: { requireComplete?: boolean } = {},
): ValidationResult {
  if (!Array.isArray(input)) {
    return { valid: false, errors: ["Decisions must be an array."] };
  }

  const errors: string[] = [];
  if (options.requireComplete !== false && input.length !== DECISION_LIMIT) {
    errors.push(`Choose exactly ${DECISION_LIMIT} decisions.`);
  } else if (input.length > DECISION_LIMIT) {
    errors.push(`Choose no more than ${DECISION_LIMIT} decisions.`);
  }

  const decisions: Decision[] = [];
  const seen = new Set<string>();
  const counts = new Map<string, number>();
  let budgetSpent = 0;

  for (const [index, item] of input.entries()) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      errors.push(`Decision ${index + 1} must be an object.`);
      continue;
    }
    const candidate = item as Record<string, unknown>;
    const measure = measures.find((entry) => entry.id === candidate.measureId);
    if (!measure) {
      errors.push(`Decision ${index + 1} has an unknown measure ID.`);
      continue;
    }
    if (seen.has(measure.id)) {
      errors.push(`${measure.id} may only be selected once.`);
    }
    seen.add(measure.id);
    counts.set(measure.category, (counts.get(measure.category) ?? 0) + 1);
    budgetSpent += measure.cost;

    if (measure.scope === "district") {
      if (
        typeof candidate.districtId !== "string" ||
        !districts.some((district) => district.id === candidate.districtId)
      ) {
        errors.push(`${measure.id} requires a valid district.`);
        continue;
      }
      decisions.push({
        measureId: measure.id,
        districtId: candidate.districtId,
      });
    } else {
      if (candidate.districtId !== undefined && candidate.districtId !== null) {
        errors.push(
          `${measure.id} is a city measure and must not have a district.`,
        );
        continue;
      }
      decisions.push({ measureId: measure.id, districtId: null });
    }
  }

  if (budgetSpent > CITY_BUDGET) {
    errors.push(`Budget exceeded: ${budgetSpent} of ${CITY_BUDGET} units.`);
  }
  for (const [category, count] of counts) {
    if (count > MAX_PER_CATEGORY) {
      errors.push(
        `Select no more than ${MAX_PER_CATEGORY} measures in ${category}.`,
      );
    }
  }
  for (const rule of incompatibilities) {
    const first = decisions.find(
      (decision) => decision.measureId === rule.measureIds[0],
    );
    const second = decisions.find(
      (decision) => decision.measureId === rule.measureIds[1],
    );
    if (
      first &&
      second &&
      (rule.scope === "global" || first.districtId === second.districtId)
    ) {
      errors.push(`${rule.measureIds.join(" + ")}: ${rule.reason}`);
    }
  }

  if (errors.length) return { valid: false, errors };

  // Canonical ordering also makes floating-point accumulation and API traces repeatable.
  decisions.sort(
    (a, b) => Number(a.measureId.slice(1)) - Number(b.measureId.slice(1)),
  );
  return { valid: true, decisions, budgetSpent };
}
