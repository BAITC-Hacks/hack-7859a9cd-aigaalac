import type { District } from "@/types";
export const CITY_BUDGET = 100;
export const DECISION_LIMIT = 5;
export const INITIAL_QOL = 52.56;
// Demo baseline. Replace these snapshots with the backend team's district data.
export const districts: District[] = [
 { id: "esil", name: "Esil", description: "The city's modern center", score: 64.2, indicators: { Transport: 62, Environment: 58, Healthcare: 68, Education: 72, Infrastructure: 61 } },
 { id: "almaty", name: "Almaty", description: "A vibrant residential hub", score: 55.8, indicators: { Transport: 48, Environment: 52, Healthcare: 58, Education: 65, Infrastructure: 56 } },
 { id: "saryarka", name: "Saryarka", description: "Heritage meets everyday life", score: 48.4, indicators: { Transport: 45, Environment: 38, Healthcare: 52, Education: 59, Infrastructure: 48 } },
 { id: "baikonur", name: "Baikonur", description: "An established urban district", score: 45.22, indicators: { Transport: 43, Environment: 46, Healthcare: 49, Education: 47, Infrastructure: 41 } },
 { id: "nura", name: "Nura", description: "A new district with potential", score: 49.18, indicators: { Transport: 38, Environment: 62, Healthcare: 45, Education: 51, Infrastructure: 50 } },
];
