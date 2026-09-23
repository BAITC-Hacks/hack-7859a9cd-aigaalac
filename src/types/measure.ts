import type { Indicators } from "./district.ts";

export type Category =
  "Transport" | "Environment" | "Social" | "Safety" | "Services";

export type Measure = {
  id: string;
  name: string;
  description: string;
  category: Category;
  cost: number;
  /** Quarters before the measure starts taking effect. */
  lag: number;
  scope: "district" | "city";
  /** Full signed effects, before the horizon/lag factor is applied. */
  effects: Partial<Indicators>;
};

export type Synergy = {
  /** Fixed bonus applies in the district targeted by the first measure. */
  measureIds: [string, string];
  effects: Partial<Indicators>;
};

export type Incompatibility = {
  measureIds: [string, string];
  scope: "global" | "district";
  reason: string;
};
