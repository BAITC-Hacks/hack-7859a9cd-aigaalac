export type IndicatorId =
  "T1" | "T2" | "E1" | "E2" | "S1" | "S2" | "B1" | "B2" | "C1" | "C2";

export type Indicators = Record<IndicatorId, number>;

export type DistrictSnapshot = {
  score: number;
  indicators: Indicators;
  populationShare: number;
};

export type District = DistrictSnapshot & {
  id: string;
  name: string;
  description: string;
};
