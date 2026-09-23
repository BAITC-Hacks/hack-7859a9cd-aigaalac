import { simulateDecisions } from "./score.ts";
import type {
  AIExplanation,
  AnalyzeResponse,
  SimulationRepository,
  SimulationResult,
} from "./types";

/** The AI is only called after trusted data and deterministic validation. */
export async function analyzeSelection(
  decisions: unknown,
  repository: SimulationRepository,
  explain: (result: SimulationResult) => Promise<AIExplanation>,
): Promise<AnalyzeResponse> {
  const [districts, actions] = await Promise.all([
    repository.getDistricts(),
    repository.getActions(),
  ]);
  const result = simulateDecisions(districts, actions, decisions);
  try {
    // Keep the authoritative result isolated from the explanation provider.
    const explanation = await explain(structuredClone(result));
    return { result, analysis: { status: "complete", explanation } };
  } catch {
    return {
      result,
      analysis: {
        status: "unavailable",
        message:
          "AI талдауы қазір қолжетімсіз. Қала көрсеткіштері есептелді. Талдауды қайта сұрап көріңіз.",
      },
    };
  }
}
