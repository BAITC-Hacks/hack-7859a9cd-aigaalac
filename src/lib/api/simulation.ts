import type { Decision, SimulationResult } from "@/types";
import { postJSON } from "./client";
import { isSimulationResult } from "../simulation/result.ts";
export { isSimulationResult };
export async function simulateStrategy(
  decisions: Decision[],
): Promise<SimulationResult> {
  const result = await postJSON("/api/simulate", { decisions });
  if (!isSimulationResult(result))
    throw new Error(
      "The simulation returned an invalid result. Check the backend response contract.",
    );
  return result;
}
