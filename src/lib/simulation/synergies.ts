import { synergies } from "../../data/synergies.ts";
import type { Decision, SimulationResult } from "../../types/index.ts";

/** Bonuses belong to the first measure's district and are never lag-scaled. */
export function getAppliedSynergies(
  decisions: Decision[],
): SimulationResult["synergies"] {
  return synergies.flatMap((synergy) => {
    const first = decisions.find(
      (decision) => decision.measureId === synergy.measureIds[0],
    );
    const second = decisions.find(
      (decision) => decision.measureId === synergy.measureIds[1],
    );
    if (!first || !second || first.districtId === null) return [];
    return [
      {
        measureIds: [...synergy.measureIds] as [string, string],
        districtId: first.districtId,
        effects: { ...synergy.effects },
      },
    ];
  });
}
