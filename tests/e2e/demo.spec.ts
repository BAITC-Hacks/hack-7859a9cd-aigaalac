import { test, expect } from "@playwright/test";
import { addMeasure, chooseFive } from "./helpers";

test("five targeted decisions, budget, removal, result and refresh", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Аким на/ })).toBeVisible();
  await page.screenshot({ path: "/tmp/akim-landing.png", fullPage: true });
  await page.getByRole("link", { name: "Начать управление" }).click();
  const run = page.getByRole("button", { name: "Run Simulation", exact: true });
  await expect(run).toBeDisabled();
  await expect(page.getByText("Critical", { exact: true })).toBeVisible();
  const bus = page.locator("article").filter({
    has: page.getByRole("heading", {
      name: "Smart bus network",
      exact: true,
    }),
  });
  await expect(
    bus.getByRole("button", { name: "Add to strategy" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Environment", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Smart bus network", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "All initiatives", exact: true })
    .click();
  await chooseFive(page);
  await expect(run).toBeEnabled();
  await expect(page.locator(".budget-summary")).toContainText("5 credits");
  await expect(
    page.getByRole("button", { name: "Added to strategy", exact: true }),
  ).toHaveCount(5);
  await expect(
    page
      .getByRole("button", { name: "5 decisions selected", exact: true })
      .first(),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Remove Digital city services" })
    .click();
  await expect(run).toBeDisabled();
  await expect(
    page
      .getByRole("button", { name: "Insufficient budget", exact: true })
      .first(),
  ).toBeDisabled();
  await addMeasure(page, "Digital city services");
  await page.screenshot({ path: "/tmp/akim-dashboard.png", fullPage: true });
  await page.reload();
  await expect(run).toBeEnabled();
  await run.click();
  await expect(page).toHaveURL(/\/results$/);
  await expect(
    page.getByText("Demo simulation complete.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Strengths", exact: true }),
  ).toBeVisible();
  await expect(page.locator("table tbody tr")).toHaveCount(5);
  await page.screenshot({ path: "/tmp/akim-results.png", fullPage: true });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "A new outlook for Astana." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Refine your strategy" }).click();
  await expect(page.getByLabel("Decision count")).toHaveText("5/5");
  await page
    .getByRole("button", { name: "Remove Digital city services" })
    .click();
  await page
    .getByRole("link", { name: "Simulation results", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Build your strategy" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
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
  await page.screenshot({ path: "/tmp/akim-mobile.png", fullPage: true });
});
