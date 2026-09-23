import type { Synergy } from "../types/index.ts";

// Fixed bonuses apply after lag-scaled measure effects, in the first measure's district.
export const synergies: Synergy[] = [
  { measureIds: ["M1", "M2"], effects: { T1: 2 } },
  { measureIds: ["M10", "M12"], effects: { B1: 2 } },
  { measureIds: ["M5", "M6"], effects: { E2: 2 } },
];
