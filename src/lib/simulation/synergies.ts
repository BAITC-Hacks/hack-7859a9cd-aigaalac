import type {
  ActivatedSynergy,
  Decision,
} from "@/types/simulation";

import type {
  District,
  IndicatorCode,
} from "@/types/district";

import { clamp } from "./effects";

export function applySynergies(
  state: Record<string, District>,
  decisions: Decision[]
): ActivatedSynergy[] {
  const activated: ActivatedSynergy[] = [];

  const byId = new Map(
    decisions.map((decision) => [
      decision.measureId,
      decision,
    ])
  );

  // M1 + M2
  if (byId.has("M1") && byId.has("M2")) {
    const m1 = byId.get("M1");

    if (m1?.districtId) {
      applyBonus(
        state,
        m1.districtId,
        "T1",
        2
      );

      activated.push({
        simulationmeasures: ["M1", "M2"],
        districtId: m1.districtId,
        indicator: "T1",
        bonus: 2,
      });
    }
  }

  // M10 + M12
  if (byId.has("M10") && byId.has("M12")) {
    const m10 = byId.get("M10");

    if (m10?.districtId) {
      applyBonus(
        state,
        m10.districtId,
        "B1",
        2
      );

      activated.push({
        simulationmeasures: ["M10", "M12"],
        districtId: m10.districtId,
        indicator: "B1",
        bonus: 2,
      });
    }
  }

  // M5 + M6
  if (byId.has("M5") && byId.has("M6")) {
    const m5 = byId.get("M5");

    if (m5?.districtId) {
      applyBonus(
        state,
        m5.districtId,
        "E2",
        2
      );

      activated.push({
        simulationmeasures: ["M5", "M6"],
        districtId: m5.districtId,
        indicator: "E2",
        bonus: 2,
      });
    }
  }

  return activated;
}

function applyBonus(
  state: Record<string, District>,
  districtId: string,
  indicator: IndicatorCode,
  bonus: number
) {
  const district = state[districtId];

  if (!district) return;

  district.indicators[indicator] = clamp(
    district.indicators[indicator] + bonus
  );
}