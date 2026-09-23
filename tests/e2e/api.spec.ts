import { test, expect } from "@playwright/test";
import { chooseFive } from "./helpers";
import { mockResult, mockAnalysis } from "../../src/data/mockResults";

test("real API mode preserves contracts and recovers from simulation and analysis errors", async ({
  page,
}) => {
  let simulateCalls = 0;
  let analysisCalls = 0;
  const completeResult = { ...mockResult, backendExtra: { preserved: true } };
  await page.route("**/api/simulate", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      decisions: [
        { measureId: "M1", districtId: "nura" },
        { measureId: "M2", districtId: "saryarka" },
        { measureId: "M3", districtId: "baikonur" },
        { measureId: "M4", districtId: "almaty" },
        { measureId: "M12", districtId: null },
      ],
    });
    simulateCalls++;
    await route.fulfill({
      status: simulateCalls === 1 ? 503 : 200,
      json:
        simulateCalls === 1
          ? { error: "Service temporarily unavailable" }
          : completeResult,
    });
  });
  await page.route("**/api/analyze", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      simulationResult: completeResult,
    });
    analysisCalls++;
    await route.fulfill({
      status: analysisCalls === 1 ? 503 : 200,
      json:
        analysisCalls === 1
          ? { error: "Analysis temporarily unavailable" }
          : { analysis: mockAnalysis },
    });
  });
  await page.goto("/simulation");
  await expect(page.getByText("Live API", { exact: true })).toBeVisible();
  await chooseFive(page);
  await page
    .getByRole("button", { name: "Run Simulation", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Service temporarily unavailable",
  );
  await page
    .getByRole("button", { name: "Run Simulation", exact: true })
    .click();
  await expect(page).toHaveURL(/\/results$/);
  await expect(page.getByRole("alert")).toContainText(
    "Analysis temporarily unavailable",
  );
  await page.getByRole("button", { name: "Retry analysis" }).click();
  await expect(
    page.getByRole("heading", { name: "Strengths", exact: true }),
  ).toBeVisible();
  expect(simulateCalls).toBe(2);
  expect(analysisCalls).toBe(2);
});
