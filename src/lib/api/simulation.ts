import type { Decision, SimulationResult } from "@/types";
import { mockResult } from "@/data/mockResults";
import { postJSON, USE_MOCK_API } from "./client";
export function isSimulationResult(value: unknown): value is SimulationResult {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  const snapshots = (v: unknown) =>
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.values(v).every(
      (s) => s && typeof s.score === "number" && Number.isFinite(s.score),
    );
  return (
    data.valid === true &&
    [
      "initialScore",
      "finalScore",
      "delta",
      "criticalBefore",
      "criticalAfter",
    ].every((k) => typeof data[k] === "number" && Number.isFinite(data[k])) &&
    snapshots(data.districtsBefore) &&
    snapshots(data.districtsAfter) &&
    Array.isArray(data.appliedEffects) &&
    Array.isArray(data.synergies)
  );
}
export async function simulateStrategy(
  decisions: Decision[],
): Promise<SimulationResult> {
  if (USE_MOCK_API) {
    await new Promise((resolve) => setTimeout(resolve, 650));
    return structuredClone(mockResult);
  }
  const result = await postJSON("/api/simulate", { decisions });
  if (!isSimulationResult(result))
    throw new Error(
      "The simulation returned an invalid result. Check the backend response contract.",
    );
  return result;
}
