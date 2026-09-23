import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Action, District, SimulationRepository } from "./types";

/** Server-only local JSON adapter. UI receives data through server components. */
export const simulationRepository: SimulationRepository = {
  async getDistricts() {
    const json = await readFile(
      path.join(process.cwd(), "data", "districts.json"),
      "utf8",
    );
    return JSON.parse(json) as District[];
  },
  async getActions() {
    const json = await readFile(
      path.join(process.cwd(), "data", "actions.json"),
      "utf8",
    );
    return JSON.parse(json) as Action[];
  },
};
