import { simulate } from "../../../src/lib/simulation/simulate.ts";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { valid: false, error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    !("decisions" in body)
  ) {
    return Response.json(
      { valid: false, error: "A decisions array is required." },
      { status: 400 },
    );
  }
  const result = simulate(body.decisions);
  if (!result.valid) {
    return Response.json(
      { ...result, error: result.errors.join(" ") },
      { status: 400 },
    );
  }
  return Response.json(result);
}
