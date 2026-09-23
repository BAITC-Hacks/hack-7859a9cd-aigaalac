import type { DistrictSnapshot, Indicators } from "./district.ts";

export type Decision = { measureId: string; districtId: string | null };

export type AppliedEffect = {
  measureId: string;
  measureName: string;
  cost: number;
  lag: number;
  factor: number;
  /** Null denotes a city-wide measure; cost is counted only once. */
  districtId: string | null;
  effects: Partial<Indicators>;
};

export type AppliedSynergy = {
  measureIds: [string, string];
  districtId: string;
  effects: Partial<Indicators>;
};

export type SimulationResult = {
  valid: true;
  decisions: Decision[];
  budgetSpent: number;
  budgetRemaining: number;
  horizonQuarters: number;
  datasetVersion: string;
  initialScore: number;
  finalScore: number;
  delta: number;
  criticalBefore: number;
  criticalAfter: number;
  districtsBefore: Record<string, DistrictSnapshot>;
  districtsAfter: Record<string, DistrictSnapshot>;
  indicatorDeltas: Record<string, Indicators>;
  appliedEffects: AppliedEffect[];
  synergies: AppliedSynergy[];
  [key: string]: unknown;
};

export type AIAnalysis = {
  summary: string;
  strengths: string[];
  risks: string[];
  tradeoffs: string[];
  recommendation: string;
};
