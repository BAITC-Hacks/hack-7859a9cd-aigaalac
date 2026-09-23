export type IndicatorCode =
  | "T1"
  | "T2"
  | "E1"
  | "E2"
  | "S1"
  | "S2"
  | "B1"
  | "B2"
  | "C1"
  | "C2";

export type Indicators = Record<IndicatorCode, number>;

export interface District {
  id: string;
  name: string;
  populationWeight: number;
  indicators: Indicators;
}