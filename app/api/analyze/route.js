import { analyzeSimulation } from '../../../lib/ai/analyst.js';

export async function POST(request) {
  try {
    const { simulationResult } = await request.json();
    const analysis = await analyzeSimulation(simulationResult);
    return Response.json({ analysis });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to analyze the simulation.' },
      { status: error?.status || 500 },
    );
  }
}
