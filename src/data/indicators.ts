import type { Category, IndicatorId, Indicators } from "../types/index.ts";

export const INDICATOR_IDS = [
  "T1",
  "T2",
  "E1",
  "E2",
  "S1",
  "S2",
  "B1",
  "B2",
  "C1",
  "C2",
] as const satisfies readonly IndicatorId[];

export const INDICATOR_WEIGHTS: Indicators = {
  T1: 0.1,
  T2: 0.1,
  E1: 0.09,
  E2: 0.11,
  S1: 0.11,
  S2: 0.11,
  B1: 0.09,
  B2: 0.09,
  C1: 0.1,
  C2: 0.1,
};

export const INDICATOR_LABELS: Record<IndicatorId, string> = {
  T1: "Traffic flow",
  T2: "Public transport access",
  E1: "Green space",
  E2: "Air quality",
  S1: "Schools and kindergartens",
  S2: "Clinics and primary care",
  B1: "Street safety",
  B2: "Road safety",
  C1: "Utility reliability",
  C2: "Resident request resolution",
};

type IndicatorMetadata = {
  category: Category;
  label: string;
  min: 0;
  max: 100;
  higherIsBetter: true;
  bestScoreMeaning: string;
  worstScoreMeaning?: string;
};

// Congestion and smog are already inverted: every indicator improves upwards.
export const INDICATOR_METADATA: Record<IndicatorId, IndicatorMetadata> = {
  T1: {
    category: "Transport",
    label: INDICATOR_LABELS.T1,
    min: 0,
    max: 100,
    higherIsBetter: true,
    bestScoreMeaning: "No traffic jams during peak hours.",
    worstScoreMeaning: "Complete gridlock.",
  },
  T2: {
    category: "Transport",
    label: INDICATOR_LABELS.T2,
    min: 0,
    max: 100,
    higherIsBetter: true,
    bestScoreMeaning:
      "Every resident is within 500 m of a stop with services at most 10 minutes apart.",
  },
  E1: {
    category: "Environment",
    label: INDICATOR_LABELS.E1,
    min: 0,
    max: 100,
    higherIsBetter: true,
    bestScoreMeaning: "At least 20 square metres of green space per resident.",
  },
  E2: {
    category: "Environment",
    label: INDICATOR_LABELS.E2,
    min: 0,
    max: 100,
    higherIsBetter: true,
    bestScoreMeaning: "Winter AQI is at most 50.",
    worstScoreMeaning: "Chronic smog.",
  },
  S1: {
    category: "Social",
    label: INDICATOR_LABELS.S1,
    min: 0,
    max: 100,
    higherIsBetter: true,
    bestScoreMeaning:
      "100% of standard school and kindergarten demand is met, without second-shift schooling.",
  },
  S2: {
    category: "Social",
    label: INDICATOR_LABELS.S2,
    min: 0,
    max: 100,
    higherIsBetter: true,
    bestScoreMeaning:
      "Primary healthcare provision meets the standard per resident in full.",
  },
  B1: {
    category: "Safety",
    label: INDICATOR_LABELS.B1,
    min: 0,
    max: 100,
    higherIsBetter: true,
    bestScoreMeaning:
      "Lighting and cameras cover all streets, with minimal incidents.",
  },
  B2: {
    category: "Safety",
    label: INDICATOR_LABELS.B2,
    min: 0,
    max: 100,
    higherIsBetter: true,
    bestScoreMeaning: "Minimal road crashes involving injuries.",
  },
  C1: {
    category: "Services",
    label: INDICATOR_LABELS.C1,
    min: 0,
    max: 100,
    higherIsBetter: true,
    bestScoreMeaning: "No heating or water supply failures during the year.",
  },
  C2: {
    category: "Services",
    label: INDICATOR_LABELS.C2,
    min: 0,
    max: 100,
    higherIsBetter: true,
    bestScoreMeaning: "All resident requests are resolved on time.",
  },
};
