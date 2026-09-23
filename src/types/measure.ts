import type { IndicatorCode } from "./district";

export type MeasureCategory =
  | "transport"
  | "ecology"
  | "social"
  | "safety"
  | "services";

export type MeasureType =
  | "district"
  | "city";

export interface Measure {
  id: string;
  name: string;
  category: MeasureCategory;
  type: MeasureType;
  cost: number;
  lag: number;

  effects: Partial<
    Record<IndicatorCode, number>
  >;
}