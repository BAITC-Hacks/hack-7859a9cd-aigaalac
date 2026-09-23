// Reference fixtures for tests only. The app calculates chosen decisions on the server.
import type { Decision, SimulationResult } from "../types/index.ts";
import { simulate } from "../lib/simulation/simulate.ts";
import { describeResult } from "../lib/simulation/describe.ts";

export const referenceDecisions: Decision[] = [
  { measureId: "M7", districtId: "nura" },
  { measureId: "M8", districtId: "nura" },
  { measureId: "M10", districtId: "nura" },
  { measureId: "M12", districtId: null },
  { measureId: "M5", districtId: "saryarka" },
];
const reference = simulate(referenceDecisions);
if (!reference.valid) throw new Error(reference.errors.join(" "));
export const mockResult: SimulationResult = reference;
export const mockAnalysis = describeResult(reference);
