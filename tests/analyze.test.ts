import assert from "node:assert/strict";
import test from "node:test";
import { analyzeSelection } from "../lib/analyze.ts";
import { simulationRepository } from "../lib/data.ts";
import { simulateDecisions, SelectionValidationError } from "../lib/score.ts";
import { buildAnalysisContext, generateExplanation, parseExplanation } from "../lib/openai.ts";
import type { Decision } from "../lib/types.ts";

const actions = await simulationRepository.getActions();
const districts = await simulationRepository.getDistricts();
const decisions: Decision[] = [
  { actionId: "M7", districtId: "nura" },
  { actionId: "M1", districtId: "nura" },
  { actionId: "M10", districtId: "nura" },
  { actionId: "M12" },
  { actionId: "M5", districtId: "saryarka" },
];
const explanation = {
  strengths: ["Нұрадағы білім көрсеткіші критикалық шектен жоғарылады."],
  tradeoffs: ["Медицина көрсеткіші критикалық шектен төмен қалды."],
  recommendations: ["Мектеп пен емхана жобаларының іске қосылу мерзімін бақылаңыз."],
};
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);

test("invalid, conflicting, unassigned or over-budget plans never call AI", async () => {
  let calls = 0;
  const explain = async () => { calls++; return explanation; };
  const invalid = [
    [], ["M7"], [{ actionId: "unknown" }],
    decisions.map((decision) => decision.actionId === "M7" ? { actionId: "M7" } : decision),
    decisions.map((decision) => decision.actionId === "M12" ? { actionId: "M12", districtId: "nura" } : decision),
    [{ actionId: "M1", districtId: "nura" }, { actionId: "M3", districtId: "esil" }, { actionId: "M9", districtId: "almaty" }, { actionId: "M10", districtId: "nura" }, { actionId: "M12" }],
    [{ actionId: "M3", districtId: "nura" }, { actionId: "M5", districtId: "saryarka" }, { actionId: "M7", districtId: "nura" }, { actionId: "M10", districtId: "nura" }, { actionId: "M13", districtId: "esil" }],
    decisions.map((decision) => ({ ...decision, cost: 0 })),
  ];
  for (const selection of invalid)
    await assert.rejects(analyzeSelection(selection, simulationRepository, explain), SelectionValidationError);
  assert.equal(calls, 0);
});

test("AI receives authoritative district results and cannot alter the returned score or districts", async () => {
  let calls = 0;
  const response = await analyzeSelection(decisions, simulationRepository, async (result) => {
    calls++;
    close(result.before.score, 52.55768);
    close(result.after.score, 55.61002);
    assert.equal(result.totalCost, 93);
    assert.equal(result.selectedActions.length, 5);
    assert.equal(result.synergies.length, 1);
    result.after.score = 100;
    result.after.districts[0].metrics.T1 = 100;
    return explanation;
  });
  assert.equal(calls, 1);
  close(response.result.after.score, 55.61002);
  assert.equal(response.result.after.districts[0].metrics.T1, 45);
  assert.deepEqual(response.analysis, { status: "complete", explanation });
});

test("provider failures retain the real score without exposing errors as AI output", async () => {
  const response = await analyzeSelection(decisions, simulationRepository, async () => { throw new Error("upstream secret"); });
  close(response.result.after.score, 55.61002);
  assert.equal(response.analysis.status, "unavailable");
  assert.ok(!JSON.stringify(response).includes("upstream secret"));
});

test("AI context includes correct targets, lag, fixed bonuses and critical indicators", () => {
  const payload = buildAnalysisContext(simulateDecisions(districts, actions, decisions));
  assert.deepEqual(payload.score, { before: 52.56, after: 55.61, change: 3.05 });
  assert.equal(payload.budget, 100);
  assert.equal(payload.spent, 93);
  assert.equal(payload.remaining, 7);
  assert.equal(payload.horizonQuarters, 8);
  assert.equal(payload.districts.length, 5);
  assert.deepEqual(payload.actualDeclines, []);
  assert.equal(payload.formula.before.criticalCount, 2);
  assert.equal(payload.formula.after.criticalCount, 1);
  assert.equal(payload.formula.before.criticalIndicators.length, 2);
  assert.deepEqual(payload.formula.after.criticalIndicators, [{ district: districts[4].name, metric: "Алғашқы медициналық көмек", value: 35 }]);
  const school = payload.decisions.find((decision) => decision.id === "M7")!;
  assert.equal(school.target, districts.find((district) => district.id === "nura")!.name);
  assert.equal(school.lagQuarters, 3);
  assert.equal(school.realizedShare, 0.625);
  assert.equal(school.fullImpact["Мектептер мен балабақшалар"], 16);
  assert.equal(school.realizedImpactBeforeLimit["Мектептер мен балабақшалар"], 10);
  const city = payload.decisions.find((decision) => decision.id === "M12")!;
  assert.equal(city.target, "Барлық бес аудан");
  assert.equal(payload.synergies.length, 1);
  assert.deepEqual(payload.synergies[0].actions, ["M10", "M12"]);
  assert.equal(payload.synergies[0].impact["Көше қауіпсіздігі"], 2);
  const nuraName = districts.find((district) => district.id === "nura")!.name;
  const nura = payload.districts.find((district) => district.name === nuraName)!;
  assert.equal(nura.populationShare, 0.16);
  assert.equal(nura.metrics.after["Мектептер мен балабақшалар"], 48);
  assert.equal(nura.metrics.after["Алғашқы медициналық көмек"], 35);
  assert.equal(nura.metrics.after["Көше қауіпсіздігі"], 67.5);
  assert.equal(nura.actionEffectsBeforeLimit.length, 4);
  assert.equal(payload.districtSummary.mostImproved, nuraName);
  assert.equal(payload.districtSummary.needsAttention, nuraName);
});

test("AI response shape rejects missing, empty or excessive sections", () => {
  assert.deepEqual(parseExplanation(explanation), explanation);
  for (const value of [null, {}, { ...explanation, strengths: [] }, { ...explanation, tradeoffs: [123] }, { ...explanation, recommendations: ["a", "b", "c"] }])
    assert.throws(() => parseExplanation(value));
});

test("OpenAI request uses server credentials, structured output and Kazakh context", async () => {
  const oldKey = process.env.OPENAI_API_KEY;
  const oldModel = process.env.OPENAI_MODEL;
  const originalFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = "test-placeholder";
  process.env.OPENAI_MODEL = "gpt-4o-mini";
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://api.openai.com/v1/chat/completions");
    assert.equal((options!.headers as Record<string, string>).Authorization, "Bearer test-placeholder");
    const body = JSON.parse(options!.body as string);
    assert.equal(body.model, "gpt-4o-mini");
    assert.equal(body.response_format.json_schema.strict, true);
    assert.match(body.messages[0].content, /Тек қазақ тілінде/);
    assert.match(body.messages[0].content, /бес бағыттың әрқайсысынан дәл бір іс-шара міндетті/);
    const payload = JSON.parse(body.messages[1].content);
    assert.equal(payload.score.after, 55.61);
    assert.equal(payload.districts.length, 5);
    assert.equal(payload.formula.after.criticalCount, 1);
    assert.ok(!body.messages[1].content.includes("test-placeholder"));
    return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(explanation) } }] });
  };
  try {
    const result = simulateDecisions(districts, actions, decisions);
    assert.deepEqual(await generateExplanation(result), explanation);
    globalThis.fetch = async () => Response.json({ error: "private details" }, { status: 429 });
    await assert.rejects(generateExplanation(result), /OpenAI request failed \(429\)/);
    globalThis.fetch = async () => Response.json({ choices: [{ finish_reason: "length", message: { content: "{}" } }] });
    await assert.rejects(generateExplanation(result), /Incomplete AI response/);
    delete process.env.OPENAI_API_KEY;
    globalThis.fetch = async () => { assert.fail("Missing key must not trigger a network request"); };
    await assert.rejects(generateExplanation(result), /not configured/);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey;
    if (oldModel === undefined) delete process.env.OPENAI_MODEL; else process.env.OPENAI_MODEL = oldModel;
  }
});
