import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADVISOR_SCHEMA,
  ANALYSIS_SCHEMA,
} from '../lib/ai/prompts.js';
import {
  adviseDistrict,
  analyzeSimulation,
  assertDistrictSnapshot,
  assertSimulationResult,
} from '../lib/ai/analyst.js';

const validResult = {
  valid: true,
  initialScore: 52.56,
  finalScore: 56.54,
  delta: 3.98,
  criticalBefore: 2,
  criticalAfter: 0,
  districtsBefore: { nura: { score: 49.18 } },
  districtsAfter: { nura: { score: 52.96 } },
  appliedEffects: [],
  synergies: [],
};

test('analysis schema is strict and stable for the UI', () => {
  assert.equal(ANALYSIS_SCHEMA.additionalProperties, false);
  assert.deepEqual(ANALYSIS_SCHEMA.required, ['summary', 'strengths', 'risks', 'tradeoffs', 'recommendation']);
  assert.equal(ADVISOR_SCHEMA.additionalProperties, false);
});

test('analysis accepts a complete valid simulation result', () => {
  assert.equal(assertSimulationResult(validResult), validResult);
});

test('analysis rejects an invalid or incomplete simulation result', () => {
  assert.throws(() => assertSimulationResult({ valid: false }), /Only a valid/);
  assert.throws(() => assertSimulationResult({ ...validResult, finalScore: '56.54' }), /finalScore/);
});

test('advisor rejects non-numeric indicator data', () => {
  assert.throws(() => assertDistrictSnapshot({ id: 'nura', name: 'Nura', indicators: { S1: '38' } }), /S1/);
});

test('analysis sends deterministic result using OpenAI strict JSON schema', async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';
  let request;
  const mockFetch = async (_url, init) => {
    request = JSON.parse(init.body);
    return { ok: true, json: async () => ({ status: 'completed', output_text: '{"summary":"ok","strengths":[],"risks":[],"tradeoffs":[],"recommendation":"next"}' }) };
  };
  const result = await analyzeSimulation(validResult, mockFetch);
  assert.equal(result.summary, 'ok');
  assert.equal(request.text.format.type, 'json_schema');
  assert.equal(request.text.format.strict, true);
  assert.deepEqual(JSON.parse(request.input[1].content), validResult);
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
});

test('advisor transmits only its district snapshot', async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-key';
  let request;
  const mockFetch = async (_url, init) => {
    request = JSON.parse(init.body);
    return { ok: true, json: async () => ({ status: 'completed', output_text: '{"district":"Nura","summary":"ok","criticalIndicators":["S2: 35"],"priorities":["Social"]}' }) };
  };
  await adviseDistrict({ id: 'nura', name: 'Nura', indicators: { S1: 38, S2: 35 } }, mockFetch);
  assert.equal(request.text.format.name, 'district_advice');
  assert.deepEqual(JSON.parse(request.input[1].content), { id: 'nura', name: 'Nura', indicators: { S1: 38, S2: 35 } });
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
});
