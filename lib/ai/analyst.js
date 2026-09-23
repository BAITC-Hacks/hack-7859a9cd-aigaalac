import {
  ADVISOR_SCHEMA,
  ADVISOR_SYSTEM_PROMPT,
  ANALYSIS_SCHEMA,
  ANALYST_SYSTEM_PROMPT,
} from './prompts.js';

const OPENAI_URL = 'https://api.openai.com/v1/responses';

function apiError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function assertSimulationResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw apiError('simulationResult must be an object.', 400);
  }
  if (result.valid !== true) throw apiError('Only a valid simulation result can be analyzed.', 400);

  for (const field of ['initialScore', 'finalScore', 'delta', 'criticalBefore', 'criticalAfter']) {
    if (typeof result[field] !== 'number' || !Number.isFinite(result[field])) {
      throw apiError(`simulationResult.${field} must be a finite number.`, 400);
    }
  }
  if (!result.districtsBefore || !result.districtsAfter) {
    throw apiError('simulationResult must include districtsBefore and districtsAfter.', 400);
  }
  return result;
}

export function assertDistrictSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw apiError('district must be an object.', 400);
  }
  if (typeof snapshot.id !== 'string' || typeof snapshot.name !== 'string') {
    throw apiError('district.id and district.name are required.', 400);
  }
  if (!snapshot.indicators || typeof snapshot.indicators !== 'object') {
    throw apiError('district.indicators is required.', 400);
  }
  for (const [key, value] of Object.entries(snapshot.indicators)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw apiError(`district.indicators.${key} must be a finite number.`, 400);
    }
  }
  return snapshot;
}

function createRequest({ systemPrompt, schemaName, schema, payload, model }) {
  return {
    model: model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
    input: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(payload) },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: schemaName,
        strict: true,
        schema,
      },
    },
  };
}

export async function requestStructuredAnalysis(options, fetchImpl = fetch) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw apiError('OPENAI_API_KEY is not configured.', 503);

  const response = await fetchImpl(OPENAI_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(createRequest(options)),
    signal: AbortSignal.timeout(30000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw apiError(body?.error?.message || 'OpenAI analysis request failed.', response.status || 502);
  }
  if (body?.status !== 'completed' || !Array.isArray(body?.output)) {
    throw apiError('OpenAI returned no completed structured response.', 502);
  }
  // Raw REST responses store text in message content. output_text is an SDK helper.
  const content = body.output
    .filter((item) => item?.type === 'message' && Array.isArray(item.content))
    .flatMap((item) => item.content);
  if (content.some((item) => item?.type === 'refusal')) {
    throw apiError('AI analysis was declined. Your calculated results remain available.', 502);
  }
  const outputText = content
    .filter((item) => item?.type === 'output_text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('');
  if (!outputText) throw apiError('OpenAI returned no structured text.', 502);
  try {
    return JSON.parse(outputText);
  } catch {
    throw apiError('OpenAI returned invalid structured JSON.', 502);
  }
}

export async function analyzeSimulation(simulationResult, fetchImpl) {
  const payload = assertSimulationResult(simulationResult);
  return requestStructuredAnalysis({
    systemPrompt: ANALYST_SYSTEM_PROMPT,
    schemaName: 'city_analysis',
    schema: ANALYSIS_SCHEMA,
    payload,
  }, fetchImpl);
}

export async function adviseDistrict(district, fetchImpl) {
  const payload = assertDistrictSnapshot(district);
  return requestStructuredAnalysis({
    systemPrompt: ADVISOR_SYSTEM_PROMPT,
    schemaName: 'district_advice',
    schema: ADVISOR_SCHEMA,
    payload,
  }, fetchImpl);
}
