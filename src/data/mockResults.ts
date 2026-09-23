import type { AIAnalysis, SimulationResult } from "@/types";
// Fixed fixtures, deliberately independent of selected decisions. No simulation formulas.
export const mockResult: SimulationResult = {
 valid: true, initialScore: 52.56, finalScore: 58.74, delta: 6.18, criticalBefore: 2, criticalAfter: 0,
 districtsBefore: { esil: { score: 64.2 }, almaty: { score: 55.8 }, saryarka: { score: 48.4 }, baikonur: { score: 45.22 }, nura: { score: 49.18 } },
 districtsAfter: { esil: { score: 67.4 }, almaty: { score: 61.2 }, saryarka: { score: 55.8 }, baikonur: { score: 51.6 }, nura: { score: 57.7 } },
 appliedEffects: [], synergies: [],
};
export const mockAnalysis: AIAnalysis = {
 summary: "This example outcome shows a more balanced city, with quality of life improving across all five districts. The largest gains appear in Nura and Saryarka.",
 strengths: ["All five districts show an improvement in quality of life.", "No critical indicators remain in this example outcome."],
 risks: ["Baikonur still has the lowest district score.", "Longer-term initiatives may need sustained funding."],
 tradeoffs: ["Investment in essential services leaves less room for future expansion.", "City-wide improvements may deliver smaller gains to the most underserved districts."],
 recommendation: "In a future round, review Baikonur's lowest indicators and prioritize access to essential services. Compare district needs before committing the next budget.",
};
