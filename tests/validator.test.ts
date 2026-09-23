import assert from "node:assert/strict";
import test from "node:test";
import { validateDecisions } from "../src/lib/simulation/validator.ts";
import type { Decision } from "../src/types/index.ts";

const sample: Decision[] = [
  { measureId: "M7", districtId: "nura" },
  { measureId: "M8", districtId: "nura" },
  { measureId: "M10", districtId: "nura" },
  { measureId: "M12", districtId: null },
  { measureId: "M5", districtId: "saryarka" },
];

function expectInvalid(
  input: unknown,
  pattern: RegExp,
  requireComplete = true,
) {
  const result = validateDecisions(input, { requireComplete });
  assert.equal(result.valid, false);
  if (result.valid) throw new Error("Expected invalid decisions");
  assert.match(result.errors.join(" "), pattern);
  assert.equal("finalScore" in result, false);
}

test("source example is valid at 95 and returns canonical copied decisions", () => {
  const original = structuredClone(sample);
  const result = validateDecisions(sample);
  assert.equal(result.valid, true);
  if (!result.valid) return;
  assert.equal(result.budgetSpent, 95);
  assert.deepEqual(
    result.decisions.map((decision) => decision.measureId),
    ["M5", "M7", "M8", "M10", "M12"],
  );
  assert.deepEqual(sample, original);
  assert.notEqual(result.decisions[0], sample[4]);
});

test("cheapest source example costs 61 and exactly 100 units is accepted", () => {
  const cheap = validateDecisions([
    { measureId: "M9", districtId: "nura" },
    { measureId: "M11", districtId: "nura" },
    { measureId: "M10", districtId: "nura" },
    { measureId: "M12" },
    { measureId: "M4", districtId: "saryarka" },
  ]);
  assert.equal(cheap.valid, true);
  if (cheap.valid) assert.equal(cheap.budgetSpent, 61);
  const exact = validateDecisions([
    { measureId: "M1", districtId: "nura" },
    { measureId: "M2", districtId: null },
    { measureId: "M4", districtId: "esil" },
    { measureId: "M5", districtId: "saryarka" },
    { measureId: "M8", districtId: "nura" },
  ]);
  assert.equal(exact.valid, true);
  if (exact.valid) assert.equal(exact.budgetSpent, 100);
});

test("rejects malformed input, missing and unknown measure IDs", () => {
  for (const input of [null, undefined, {}, "M7", { decisions: sample }]) {
    expectInvalid(input, /array/);
  }
  for (const item of [null, [], "M7", 7]) {
    expectInvalid([item, ...sample.slice(1)], /must be an object/);
  }
  for (const item of [
    {},
    { measureId: 7 },
    { measureId: "M0" },
    { measureId: "M15" },
  ]) {
    expectInvalid([item, ...sample.slice(1)], /unknown measure/);
  }
});

test("complete plans require exactly five decisions", () => {
  for (const decisions of [
    [],
    sample.slice(0, 4),
    [...sample, { measureId: "M14", districtId: null }],
  ]) {
    expectInvalid(decisions, /exactly 5/);
  }
});

test("duplicate measures are rejected even when assigned to different districts", () => {
  expectInvalid(
    [...sample.slice(0, 4), { measureId: "M10", districtId: "almaty" }],
    /M10 may only be selected once/,
  );
});

test("district measures require a known district and city measures reject any district", () => {
  for (const districtId of [undefined, null, "", "city", "unknown", 1]) {
    expectInvalid(
      [{ measureId: "M7", districtId }, ...sample.slice(1)],
      /M7 requires a valid district/,
    );
  }
  for (const districtId of ["nura", "city", "", 1]) {
    const plan = sample.map((decision) =>
      decision.measureId === "M12"
        ? { measureId: "M12", districtId }
        : decision,
    );
    expectInvalid(plan, /M12 is a city measure/);
  }
  const result = validateDecisions(
    sample.map((decision) =>
      decision.measureId === "M12" ? { measureId: "M12" } : decision,
    ),
  );
  assert.equal(result.valid, true);
  if (result.valid)
    assert.equal(
      result.decisions.find((decision) => decision.measureId === "M12")
        ?.districtId,
      null,
    );
});

test("budget is taken from the dataset and cannot be forged by the client", () => {
  expectInvalid(
    sample.map((decision) =>
      decision.measureId === "M10"
        ? { measureId: "M1", districtId: "nura", cost: 0 }
        : { ...decision, cost: 0 },
    ),
    /Budget exceeded: 101 of 100/,
  );
});

test("at most two measures per direction is enforced", () => {
  expectInvalid(
    [
      { measureId: "M7", districtId: "nura" },
      { measureId: "M8", districtId: "nura" },
      { measureId: "M9", districtId: "nura" },
      { measureId: "M10", districtId: "nura" },
      { measureId: "M12", districtId: null },
    ],
    /no more than 2 measures in Social/,
  );
});

test("M1 and M3 conflict globally, including in different districts", () => {
  for (const districtId of ["nura", "esil"]) {
    expectInvalid(
      [
        { measureId: "M1", districtId: "nura" },
        { measureId: "M3", districtId },
      ],
      /M1 \+ M3/,
      false,
    );
  }
});

test("land and utilities conflicts only apply within the same district", () => {
  for (const [first, second] of [
    ["M4", "M7"],
    ["M5", "M13"],
  ]) {
    expectInvalid(
      [
        { measureId: first, districtId: "nura" },
        { measureId: second, districtId: "nura" },
      ],
      new RegExp(`${first} \\+ ${second}`),
      false,
    );
    const differentDistricts = validateDecisions(
      [
        { measureId: first, districtId: "nura" },
        { measureId: second, districtId: "esil" },
      ],
      { requireComplete: false },
    );
    assert.equal(differentDistricts.valid, true);
  }
});

test("draft validation allows empty and partial plans but still enforces every other rule", () => {
  assert.deepEqual(validateDecisions([], { requireComplete: false }), {
    valid: true,
    decisions: [],
    budgetSpent: 0,
  });
  assert.equal(
    validateDecisions(sample.slice(0, 2), { requireComplete: false }).valid,
    true,
  );
  expectInvalid(
    [...sample, { measureId: "M14", districtId: null }],
    /no more than 5/,
    false,
  );
  expectInvalid(
    [{ measureId: "M7", districtId: null }],
    /valid district/,
    false,
  );
  expectInvalid([sample[0], sample[0]], /only be selected once/, false);
  expectInvalid(
    [...sample.slice(0, 2), { measureId: "M9", districtId: "esil" }],
    /no more than 2/,
    false,
  );
  expectInvalid(
    [
      { measureId: "M3", districtId: "nura" },
      { measureId: "M13", districtId: "almaty" },
      { measureId: "M5", districtId: "saryarka" },
      { measureId: "M7", districtId: "nura" },
    ],
    /Budget exceeded/,
    false,
  );
});
