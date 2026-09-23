import type { IndicatorCode } from "@/types/district";

export const BUDGET = 100;
export const HORIZON = 8;
export const REQUIRED_DECISIONS = 5;
export const MAX_CATEGORY_DECISIONS = 2;
export const CRITICAL_THRESHOLD = 40;

export const INDICATOR_WEIGHTS: Record<IndicatorCode, number> = {
  T1: 0.10,
  T2: 0.10,
  E1: 0.09,
  E2: 0.11,
  S1: 0.11,
  S2: 0.11,
  B1: 0.09,
  B2: 0.09,
  C1: 0.10,
  C2: 0.10,
};