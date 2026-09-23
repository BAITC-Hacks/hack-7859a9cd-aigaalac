import type { AIAnalysis, SimulationResult } from "@/types";
import { mockAnalysis } from "@/data/mockResults";
import { postJSON, USE_MOCK_API } from "./client";
export async function analyzeResult(result: SimulationResult): Promise<AIAnalysis> {
 if (USE_MOCK_API) { await new Promise(resolve => setTimeout(resolve, 800)); return structuredClone(mockAnalysis); }
 const response = await postJSON("/api/analyze", { simulationResult: result }) as { analysis?: AIAnalysis } | null;
 const analysis = response?.analysis;
 if (!analysis || typeof analysis.summary !== "string" || typeof analysis.recommendation !== "string" || ![analysis.strengths, analysis.risks, analysis.tradeoffs].every(v => Array.isArray(v) && v.every(item => typeof item === "string"))) throw new Error("The analysis returned an unexpected response. Please try again.");
 return analysis;
}
