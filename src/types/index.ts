export type Decision = { measureId: string; districtId: string | null };
export type Category =
  "Transport" | "Environment" | "Social" | "Infrastructure";
export type District = {
  id: string;
  name: string;
  description: string;
  score: number;
  indicators: Record<string, number>;
};
export type Measure = {
  id: string;
  name: string;
  description: string;
  category: Category;
  cost: number;
  lag: string;
  scope: "district" | "city";
  effects: string[];
};
export type DistrictSnapshot = {
  score: number;
  indicators?: Record<string, number>;
};
export type SimulationResult = {
  valid: true;
  initialScore: number;
  finalScore: number;
  delta: number;
  criticalBefore: number;
  criticalAfter: number;
  districtsBefore: Record<string, DistrictSnapshot>;
  districtsAfter: Record<string, DistrictSnapshot>;
  appliedEffects: unknown[];
  synergies: unknown[];
  [key: string]: unknown;
};
export type AIAnalysis = {
  summary: string;
  strengths: string[];
  risks: string[];
  tradeoffs: string[];
  recommendation: string;
};
