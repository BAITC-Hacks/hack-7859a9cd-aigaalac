import { analyzeSelection } from "@/lib/analyze";
import { simulationRepository } from "@/lib/data";
import { generateExplanation } from "@/lib/openai";
import { SelectionValidationError } from "@/lib/score";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 4096)
      return Response.json({ error: "Сұрау тым үлкен." }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return Response.json(
      { error: "Жарамды JSON сұрауын жіберіңіз." },
      { status: 400 },
    );
  }
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => key !== "decisions")
  ) {
    return Response.json(
      { error: "Тек decisions өрісін жіберіңіз." },
      { status: 400 },
    );
  }
  try {
    const response = await analyzeSelection(
      (body as { decisions?: unknown }).decisions,
      simulationRepository,
      generateExplanation,
    );
    return Response.json(response, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof SelectionValidationError) {
      return Response.json(
        { error: error.message, validation: error.validation },
        { status: 400 },
      );
    }
    return Response.json(
      { error: "Деректерді оқу мүмкін болмады. Қайта байқап көріңіз." },
      { status: 500 },
    );
  }
}
