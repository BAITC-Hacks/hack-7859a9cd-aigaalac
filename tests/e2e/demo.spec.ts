import { test, expect } from "@playwright/test";
import { addMeasure, chooseFive, measureCard } from "./helpers";

test("full dataset drives the reference scenario, refresh and strategy edits", async ({
  page,
}) => {
  const errors: string[] = [];
  const analysisRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/analyze") {
      analysisRequests.push(request.url());
    }
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Аким на/ })).toBeVisible();
  await page.screenshot({ path: "/tmp/akim-landing.png", fullPage: true });
  await page.getByRole("link", { name: "Начать управление" }).click();

  const run = page.getByRole("button", { name: "Run Simulation", exact: true });
  await expect(run).toBeDisabled();
  await expect(page.locator("[data-measure-id]")).toHaveCount(14);
  await expect(
    page.getByLabel("Filter initiatives").getByRole("button"),
  ).toHaveCount(6);
  for (const category of [
    "Transport",
    "Environment",
    "Social",
    "Safety",
    "Services",
  ]) {
    await expect(
      page
        .getByLabel("Filter initiatives")
        .getByRole("button", { name: category, exact: true }),
    ).toBeVisible();
  }
  const nura = page.getByRole("region", {
    name: "Nura indicators",
    exact: true,
  });
  await expect(nura.getByRole("meter")).toHaveCount(10);
  await expect(nura.getByText("Critical", { exact: true })).toHaveCount(2);
  await expect(
    nura.getByRole("meter", {
      name: "S1 · Schools and kindergartens",
      exact: true,
    }),
  ).toHaveAttribute("aria-valuenow", "38");
  await expect(
    nura.getByRole("meter", {
      name: "S2 · Clinics and primary care",
      exact: true,
    }),
  ).toHaveAttribute("aria-valuenow", "35");
  await expect(
    measureCard(page, "M1").getByRole("button", { name: "Add to strategy" }),
  ).toBeDisabled();
  await expect(
    measureCard(page, "M2").getByLabel("Target district"),
  ).toHaveCount(0);
  await expect(measureCard(page, "M2")).toContainText("City-wide");
  await expect(
    measureCard(page, "M11").getByLabel("Target district"),
  ).toBeVisible();
  await expect(measureCard(page, "M11")).toContainText("T1 -2");

  await page.getByRole("button", { name: "Environment", exact: true }).click();
  await expect(page.locator("[data-measure-id]")).toHaveCount(3);
  await expect(measureCard(page, "M1")).toHaveCount(0);
  await page
    .getByRole("button", { name: "All initiatives", exact: true })
    .click();
  await chooseFive(page);
  await expect(run).toBeEnabled();
  await expect(page.locator(".budget-summary")).toContainText("95");
  await expect(page.locator(".budget-summary")).toContainText("5 credits");
  await expect(
    page.getByRole("button", { name: "Added to strategy", exact: true }),
  ).toHaveCount(5);
  await expect(
    measureCard(page, "M1").getByRole("button", {
      name: "5 decisions selected",
      exact: true,
    }),
  ).toBeDisabled();

  await page
    .getByRole("button", {
      name: "Remove Unified resident request platform",
      exact: true,
    })
    .click();
  await expect(run).toBeDisabled();
  await expect(
    measureCard(page, "M2").getByRole("button", {
      name: "Insufficient budget",
      exact: true,
    }),
  ).toBeDisabled();
  await addMeasure(page, "M12");
  await page.screenshot({ path: "/tmp/akim-dashboard.png", fullPage: true });
  await page.reload();
  await expect(run).toBeEnabled();

  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/simulate" &&
      response.request().method() === "POST",
  );
  await run.click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const calculated = await response.json();
  expect(calculated.budgetSpent).toBe(95);
  expect(calculated.finalScore).toBeCloseTo(56.54307, 8);
  expect(calculated.criticalBefore).toBe(2);
  expect(calculated.criticalAfter).toBe(0);
  expect(calculated.synergies).toEqual([
    { measureIds: ["M10", "M12"], districtId: "nura", effects: { B1: 2 } },
  ]);

  await expect(page).toHaveURL(/\/results$/);
  await expect(
    page.getByText("Simulation complete.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".result-notice")).toContainText(
    "95/100 credits used",
  );
  await expect(
    page
      .locator(".result-stats .stat-card")
      .filter({ hasText: "Final quality of life" }),
  ).toContainText("56.54");
  await expect(page.locator(".analysis-panel")).toContainText(
    "Rules-based summary · not AI",
  );
  await expect(
    page.getByRole("heading", { name: "Strengths", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".simulation-details")
      .getByText("M10 + M12 · Nura", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".simulation-details details")).toHaveCount(5);
  await page
    .locator(".simulation-details details")
    .filter({ hasText: "Nura ·" })
    .locator("summary")
    .click();
  await expect(
    page
      .getByRole("table", { name: "Nura indicator changes" })
      .locator("tbody tr"),
  ).toHaveCount(10);
  await page.screenshot({ path: "/tmp/akim-results.png", fullPage: true });

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "A new outlook for Astana." }),
  ).toBeVisible();
  await expect(
    page
      .locator(".result-stats .stat-card")
      .filter({ hasText: "Final quality of life" }),
  ).toContainText("56.54");
  await page.getByRole("link", { name: "Refine your strategy" }).click();
  await page
    .getByRole("button", {
      name: "Remove Unified resident request platform",
      exact: true,
    })
    .click();
  await expect(run).toBeDisabled();
  await page
    .getByRole("link", { name: "Simulation results", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Build your strategy" }),
  ).toBeVisible();
  expect(analysisRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test("category limits and district/global conflicts explain rejected choices", async ({
  page,
}) => {
  await page.goto("/simulation");
  await addMeasure(page, "M7", "nura");
  await addMeasure(page, "M8", "nura");
  await addMeasure(page, "M9", "nura");
  await expect(page.locator(".strategy-panel .error-message")).toContainText(
    "Select no more than 2 measures in Social",
  );
  await expect(page.locator(".decision-slot.filled")).toHaveCount(2);
  await expect(
    measureCard(page, "M9").getByRole("button", {
      name: "Add to strategy",
      exact: true,
    }),
  ).toBeEnabled();

  await page
    .getByRole("button", {
      name: "Remove Modular school and kindergarten",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Remove Family health centre or clinic",
      exact: true,
    })
    .click();
  await addMeasure(page, "M1", "nura");
  await addMeasure(page, "M3", "esil");
  await expect(page.locator(".strategy-panel .error-message")).toContainText(
    "M1 + M3",
  );
  await expect(page.locator(".decision-slot.filled")).toHaveCount(1);

  await page
    .getByRole("button", { name: "Remove Dedicated bus lanes", exact: true })
    .click();
  await addMeasure(page, "M4", "nura");
  await addMeasure(page, "M7", "nura");
  await expect(page.locator(".strategy-panel .error-message")).toContainText(
    "M4 + M7",
  );
  await expect(page.locator(".decision-slot.filled")).toHaveCount(1);
  await addMeasure(page, "M7", "esil");
  await expect(page.locator(".strategy-panel .error-message")).toHaveCount(0);
  await expect(page.locator(".decision-slot.filled")).toHaveCount(2);
});

test("direct results entry and mobile pages remain usable without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/results");
  await expect(
    page.getByRole("link", { name: "Build your strategy" }),
  ).toBeVisible();
  for (const route of ["/", "/simulation", "/results"]) {
    await page.goto(route);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/simulation");
  await expect(
    measureCard(page, "M2").getByRole("button", { name: "Add to strategy" }),
  ).toBeEnabled();
  await page.screenshot({ path: "/tmp/akim-mobile.png", fullPage: true });
});
