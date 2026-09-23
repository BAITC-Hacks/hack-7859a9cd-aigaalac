import type { Incompatibility } from "../types/index.ts";

export const incompatibilities: Incompatibility[] = [
  {
    measureIds: ["M1", "M3"],
    scope: "global",
    reason:
      "Choose either dedicated bus lanes or light rail, even when targeting different districts.",
  },
  {
    measureIds: ["M4", "M7"],
    scope: "district",
    reason:
      "A park and modular school cannot share the same district because they compete for land.",
  },
  {
    measureIds: ["M5", "M13"],
    scope: "district",
    reason:
      "Clean fuel and utility network renewal cannot target the same district because the programmes overlap.",
  },
];
