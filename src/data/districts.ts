import type { District } from "../types/index.ts";
import { INDICATOR_IDS, INDICATOR_WEIGHTS } from "./indicators.ts";

export const CITY_BUDGET = 100;
export const DECISION_LIMIT = 5;
export const HORIZON_QUARTERS = 8;
export const MAX_PER_CATEGORY = 2;
export const DATASET_VERSION = "astana-v1";

// Synthetic hackathon baseline. Every run starts from these same 50 values.
const districtBaselines: Omit<District, "score">[] = [
  {
    id: "esil",
    name: "Esil",
    description:
      "Affluent district with bridge congestion and overcrowded schools.",
    populationShare: 0.27,
    indicators: {
      T1: 45,
      T2: 62,
      E1: 68,
      E2: 72,
      S1: 48,
      S2: 55,
      B1: 78,
      B2: 60,
      C1: 75,
      C2: 70,
    },
  },
  {
    id: "almaty",
    name: "Almaty",
    description: "Aging utilities and congested roads.",
    populationShare: 0.24,
    indicators: {
      T1: 40,
      T2: 75,
      E1: 50,
      E2: 55,
      S1: 60,
      S2: 65,
      B1: 62,
      B2: 52,
      C1: 50,
      C2: 60,
    },
  },
  {
    id: "saryarka",
    name: "Saryarka",
    description: "Smog from private homes and limited green space.",
    populationShare: 0.2,
    indicators: {
      T1: 50,
      T2: 70,
      E1: 42,
      E2: 40,
      S1: 62,
      S2: 68,
      B1: 58,
      B2: 55,
      C1: 45,
      C2: 55,
    },
  },
  {
    id: "baikonur",
    name: "Baikonur",
    description: "A middle-ranking district without pronounced imbalances.",
    populationShare: 0.13,
    indicators: {
      T1: 52,
      T2: 68,
      E1: 55,
      E2: 50,
      S1: 58,
      S2: 60,
      B1: 52,
      B2: 58,
      C1: 55,
      C2: 58,
    },
  },
  {
    id: "nura",
    name: "Nura",
    description:
      "The most underserved district for social infrastructure and public transport.",
    populationShare: 0.16,
    indicators: {
      T1: 55,
      T2: 40,
      E1: 45,
      E2: 65,
      S1: 38,
      S2: 35,
      B1: 55,
      B2: 50,
      C1: 60,
      C2: 50,
    },
  },
];

export const districts: District[] = districtBaselines.map((district) => ({
  ...district,
  score: INDICATOR_IDS.reduce(
    (score, indicator) =>
      score + district.indicators[indicator] * INDICATOR_WEIGHTS[indicator],
    0,
  ),
}));

const populationWeightedScore = districts.reduce(
  (sum, district) => sum + district.populationShare * district.score,
  0,
);
const criticalCount = districts.reduce(
  (sum, district) =>
    sum + INDICATOR_IDS.filter((id) => district.indicators[id] < 40).length,
  0,
);

// Keep full precision in calculations; the UI rounds only when displaying it.
export const INITIAL_QOL =
  0.7 * populationWeightedScore +
  0.3 * Math.min(...districts.map((district) => district.score)) -
  criticalCount;
