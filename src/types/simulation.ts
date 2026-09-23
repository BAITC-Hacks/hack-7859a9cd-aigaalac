import type {
  District,
  IndicatorCode,
} from "./district";

export interface Decision {
  measureId: string;
  districtId: string | null;
}

export interface ValidationError {
  code: string;
  message: string;
}

export interface AppliedEffect {
  measureId: string;
  districtId: string;
  indicator: IndicatorCode;
  fullEffect: number;
  lag: number;
  realizedEffect: number;
  before: number;
  after: number;
}

export interface ActivatedSynergy {
  simulationmeasures: [string, string];
  districtId: string;
  indicator: IndicatorCode;
  bonus: number;
}

export interface SimulationResult {
  valid: boolean;

  validationErrors: ValidationError[];

  budget?: {
    total: number;
    spent: number;
    remaining: number;
  };

  score?: {
    initial: number;
    final: number;
    delta: number;
  };

  criticalIndicators?: {
    before: number;
    after: number;
  };

  simulationdistrictsBefore?: Record<string, District>;
  simulationdistrictsAfter?: Record<string, District>;

  simulationDistrictscoresBefore?: Record<string, number>;
  simulationDistrictscoresAfter?: Record<string, number>;

  selectedSimulationMeasures?: Decision[];

  appliedEffects?: AppliedEffect[];

  activatedSynergies?: ActivatedSynergy[];
}