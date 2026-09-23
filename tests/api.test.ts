import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/simulate/route.ts";
import { referenceDecisions } from "../src/data/mockResults.ts";

const request = (body: unknown) =>
  new Request("http://localhost/api/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

test("simulation endpoint returns reference calculations and full explanation data", async () => {
  const response = await POST(request({ decisions: referenceDecisions }));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.ok(Math.abs(result.finalScore - 56.54307) < 1e-8);
  assert.equal(result.budgetSpent, 95);
  assert.equal(result.appliedEffects.length, 5);
  assert.deepEqual(result.synergies[0].effects, { B1: 2 });
  assert.equal(Object.keys(result.districtsAfter.nura.indicators).length, 10);
});

test("simulation endpoint rejects malformed bodies and invalid strategies without a score", async () => {
  for (const body of [
    null,
    [],
    {},
    { decisions: [] },
    { decisions: [...referenceDecisions, referenceDecisions[0]] },
  ]) {
    const response = await POST(request(body));
    assert.equal(response.status, 400);
    const result = await response.json();
    assert.equal(result.valid, false);
    assert.equal(typeof result.error, "string");
    assert.equal("finalScore" in result, false);
  }
  const response = await POST(
    new Request("http://localhost/api/simulate", { method: "POST", body: "{" }),
  );
  assert.equal(response.status, 400);
});

test("client-supplied prices, effects and initial scores cannot alter authoritative results", async () => {
  const response = await POST(
    request({
      decisions: referenceDecisions.map((d) => ({
        ...d,
        cost: 0,
        effects: { S1: 100 },
      })),
      initialScore: 100,
      budget: 999,
      districts: [],
    }),
  );
  const result = await response.json();
  assert.equal(result.budgetSpent, 95);
  assert.ok(Math.abs(result.initialScore - 52.55768) < 1e-8);
  assert.ok(Math.abs(result.finalScore - 56.54307) < 1e-8);
});
