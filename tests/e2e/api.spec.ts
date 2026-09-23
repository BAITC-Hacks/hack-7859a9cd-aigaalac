import { test, expect } from "@playwright/test";
import { chooseFive, referenceDecisions } from "./helpers";
import type { AIAnalysis, SimulationResult } from "../../src/types";

const analysis: AIAnalysis = {
  summary:
    "The calculated scenario improves the city score from 52.56 to 56.54.",
  strengths: [
    "Nura no longer has education or healthcare indicators below 40.",
  ],
  risks: [
    "Five credits remain, so the remaining infrastructure needs require prioritisation.",
  ],
  tradeoffs: [
    "The selected social facilities take three quarters to begin working.",
  ],
  recommendation:
    "Compare this scenario with a transport-focused allocation before deciding.",
};

test("live mode recovers from errors and passes the complete server calculation to analysis", async ({
  page,
}) => {
  let simulateCalls = 0;
  let analysisCalls = 0;
  let completeResultPromise: Promise<SimulationResult> | undefined;
  await page.route("**/api/simulate", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      decisions: referenceDecisions,
    });
    simulateCalls++;
    if (simulateCalls === 1) {
      await route.fulfill({
        status: 503,
        json: { error: "Service temporarily unavailable" },
      });
      return;
    }
    // The retry reaches the actual route and deterministic engine.
    await route.continue();
  });
  await page.route("**/api/analyze", async (route) => {
    expect(completeResultPromise).toBeDefined();
    const completeResult = await completeResultPromise!;
    expect(route.request().postDataJSON()).toEqual({
      simulationResult: completeResult,
    });
    expect(completeResult.datasetVersion).toBe("astana-v1");
    expect(completeResult.budgetSpent).toBe(95);
    expect(completeResult.budgetRemaining).toBe(5);
    expect(completeResult.horizonQuarters).toBe(8);
    expect(completeResult.finalScore).toBeCloseTo(56.54307, 8);
    expect(Object.keys(completeResult.indicatorDeltas)).toHaveLength(5);
    expect(
      Object.keys(completeResult.districtsAfter.nura.indicators),
    ).toHaveLength(10);
    expect(completeResult.appliedEffects).toHaveLength(5);
    expect(completeResult.synergies).toEqual([
      { measureIds: ["M10", "M12"], districtId: "nura", effects: { B1: 2 } },
    ]);
    analysisCalls++;
    // Stub only the paid AI boundary; every score comes from the real server.
    await route.fulfill({
      status: analysisCalls === 1 ? 503 : 200,
      json:
        analysisCalls === 1
          ? { error: "Analysis temporarily unavailable" }
          : { analysis },
    });
  });
  await page.goto("/simulation");
  await expect(page.getByText("Astana · City Simulator", { exact: true })).toBeVisible();
  await chooseFive(page);
  await page
    .getByRole("button", { name: "Run Simulation", exact: true })
    .click();
  await expect(page.locator(".strategy-panel .error-message")).toContainText(
    "Service temporarily unavailable",
  );

  completeResultPromise = page
    .waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/simulate" &&
        response.request().method() === "POST" &&
        response.status() === 200,
    )
    .then((response) => response.json());
  await page
    .getByRole("button", { name: "Run Simulation", exact: true })
    .click();
  // On a cold dev server, route compilation can exceed the default UI assertion timeout.
  await completeResultPromise;
  await expect(page).toHaveURL(/\/results$/, { timeout: 15000 });
  await expect(
    page.locator(".analysis-panel").getByRole("alert"),
  ).toContainText("Analysis temporarily unavailable");
  await page.getByRole("button", { name: "Retry analysis" }).click();
  await expect(
    page.getByRole("heading", { name: "Strengths", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".analysis-panel .analysis-summary")).toHaveText(
    analysis.summary,
  );
  expect(simulateCalls).toBe(2);
  expect(analysisCalls).toBe(2);
});

test("actual API rejects invalid scenarios and changed district choices change the score", async ({
  request,
}) => {
  const incomplete = await request.post("/api/simulate", {
    data: { decisions: [] },
  });
  expect(incomplete.status()).toBe(400);
  const incompleteBody = await incomplete.json();
  expect(incompleteBody.valid).toBe(false);
  expect(incompleteBody.error).toContain("exactly 5");
  expect(incompleteBody).not.toHaveProperty("finalScore");

  const overspent = await request.post("/api/simulate", {
    data: {
      decisions: [
        { measureId: "M3", districtId: "esil" },
        { measureId: "M5", districtId: "saryarka" },
        { measureId: "M7", districtId: "nura" },
        { measureId: "M8", districtId: "nura" },
        { measureId: "M10", districtId: "nura" },
      ],
      budget: 1000,
    },
  });
  expect(overspent.status()).toBe(400);
  const overspentBody = await overspent.json();
  expect(overspentBody.error).toContain("Budget exceeded: 111 of 100");
  expect(overspentBody).not.toHaveProperty("finalScore");

  const baseline = await request.post("/api/simulate", {
    data: { decisions: referenceDecisions },
  });
  expect(baseline.status()).toBe(200);
  const result = await baseline.json();
  expect(result.valid).toBe(true);
  expect(result.initialScore).toBeCloseTo(52.55768, 8);
  expect(result.finalScore).toBeCloseTo(56.54307, 8);
  expect(result.criticalAfter).toBe(0);

  const changed = await request.post("/api/simulate", {
    data: {
      decisions: referenceDecisions.map((decision) =>
        decision.measureId === "M7"
          ? { ...decision, districtId: "esil" }
          : decision,
      ),
    },
  });
  expect(changed.status()).toBe(200);
  const changedResult = await changed.json();
  expect(changedResult.valid).toBe(true);
  expect(changedResult.budgetSpent).toBe(result.budgetSpent);
  expect(changedResult.finalScore).not.toBeCloseTo(result.finalScore, 8);
  expect(changedResult.criticalAfter).toBe(1);
  expect(changedResult.districtsAfter.nura.indicators.S1).toBe(38);

  const repeated = await request.post("/api/simulate", {
    data: { decisions: referenceDecisions },
  });
  expect(repeated.status()).toBe(200);
  expect(await repeated.json()).toEqual(result);
});
