export type Category = "transport" | "ecology" | "social" | "safety" | "services";

/** All ten indicators are benefit scores: 100 is the best state. */
export interface Metrics {
  T1: number; T2: number;
  E1: number; E2: number;
  S1: number; S2: number;
  B1: number; B2: number;
  C1: number; C2: number;
}
export type MetricKey = keyof Metrics;

export interface District {
  id: string;
  name: string;
  character?: string;
  description?: string;
  populationShare: number;
  metrics: Metrics;
}

export interface Action {
  id: string;
  category: Category;
  title: string;
  description: string;
  cost: number;
  scope: "district" | "city";
  /** Quarters before the measure starts working. */
  lag: number;
  /** Full impact, before multiplying by the realized share. */
  impact: Partial<Metrics>;
}

export interface Decision { actionId: string; districtId?: string }
export interface SelectedAction extends Action { districtId?: string }

export interface SimulationRepository {
  getDistricts(): Promise<District[]>;
  getActions(): Promise<Action[]>;
}

export type ValidationCode =
  | "INVALID_SELECTION" | "DECISION_COUNT" | "DUPLICATE_ACTION"
  | "UNKNOWN_ACTION" | "DISTRICT_REQUIRED" | "UNKNOWN_DISTRICT"
  | "UNEXPECTED_DISTRICT" | "CATEGORY_LIMIT" | "CATEGORY_REQUIRED" | "INCOMPATIBLE" | "OVER_BUDGET";
export interface ValidationIssue { code: ValidationCode; message: string }
export interface SelectionValidation {
  valid: boolean;
  selectedActions: SelectedAction[];
  decisionCount: number;
  categoryCounts: Record<Category, number>;
  totalCost: number;
  remainingBudget: number;
  overBudgetBy: number;
  issues: ValidationIssue[];
}

export interface AppliedSynergy {
  id: string;
  actionIds: [string, string];
  districtId: string;
  impact: Partial<Metrics>;
}

export interface SimulationSnapshot {
  districts: District[];
  averageMetrics: Metrics;
  districtScores: Record<string, number>;
  weightedAverage: number;
  weakestDistrictScore: number;
  criticalCount: number;
  criticalIndicators: { districtId: string; metric: MetricKey; value: number }[];
  score: number;
}
export interface SimulationResult {
  budget: number;
  totalCost: number;
  remainingBudget: number;
  selectedActions: SelectedAction[];
  before: SimulationSnapshot;
  after: SimulationSnapshot;
  scoreChange: number;
  synergies: AppliedSynergy[];
}

/** Live district effects only; incomplete plans never receive a city score. */
export interface SimulationPreview {
  districts: District[];
  selectedActions: SelectedAction[];
  synergies: AppliedSynergy[];
}

export interface AIExplanation {
  strengths: string[];
  tradeoffs: string[];
  recommendations: string[];
}
export type AnalysisState =
  | { status: "complete"; explanation: AIExplanation }
  | { status: "unavailable"; message: string };
export interface AnalyzeResponse { result: SimulationResult; analysis: AnalysisState }
