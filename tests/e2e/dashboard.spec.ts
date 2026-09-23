import { test, expect } from "@playwright/test";
import { categories, measures } from "../../src/data/measures";
import { districts } from "../../src/data/districts";
import { addMeasure } from "./helpers";

function measureCard(page: import("@playwright/test").Page, name: string) {
  return page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
}

test("light-only dashboard uses district cards without loading the map", async ({
  page,
}) => {
  const tileRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("tiles.openfreemap.org"))
      tileRequests.push(request.url());
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => localStorage.setItem("akim-theme", "dark"));
  await page.goto("/simulation");
  await expect(
    page.getByRole("button", { name: "Run Simulation", exact: true }),
  ).toBeDisabled();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(
    page.getByRole("button", { name: /Switch to .* mode/ }),
  ).toHaveCount(0);
  await expect(page.getByTestId("astana-map")).toHaveCount(0);
  await expect(page.getByText("Demo dataset", { exact: true })).toBeVisible();
  const navigation = page.getByRole("group", { name: "District navigation" });
  await expect(navigation.getByRole("button")).toHaveCount(5);
  for (const district of districts) {
    const button = navigation.getByRole("button", {
      name: new RegExp(district.name),
    });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    const details = page.getByRole("region", {
      name: `${district.name} indicators`,
    });
    await expect(details).toBeVisible();
    const criticalCount = Object.values(district.indicators).filter(
      (value) => value < 40,
    ).length;
    await expect(details.getByText("Critical", { exact: true })).toHaveCount(
      criticalCount,
    );
  }
  // District navigation also works from a keyboard.
  const firstDistrict = navigation.getByRole("button").first();
  await firstDistrict.focus();
  await page.keyboard.press("Enter");
  await expect(firstDistrict).toHaveAttribute("aria-pressed", "true");
  expect(tileRequests).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem("akim-theme"))).toBe(
    "dark",
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(
    page.getByRole("button", { name: "Run Simulation", exact: true }),
  ).toBeDisabled();
  await page.screenshot({
    path: "/tmp/akim-simple-dashboard.png",
    fullPage: true,
    animations: "disabled",
  });
});

test("all category filters, combined search, empty state and district selection work", async ({
  page,
}) => {
  await page.goto("/simulation");
  const filters = page.getByRole("group", { name: "Filter initiatives" });
  for (const category of categories) {
    await filters.getByRole("button", { name: category, exact: true }).click();
    await expect(page.locator(".measure-card")).toHaveCount(
      measures.filter((m) => m.category === category).length,
    );
    await expect(
      filters.getByRole("button", { name: category, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  await filters
    .getByRole("button", { name: "All initiatives", exact: true })
    .click();
  await expect(page.locator(".measure-card")).toHaveCount(measures.length);
  const search = page.getByRole("textbox", { name: "Search initiatives" });
  await search.fill("  SMART BUS  ");
  await expect(page.locator(".measure-card")).toHaveCount(1);
  const bus = measureCard(page, "Smart bus network");
  await expect(
    bus.getByRole("button", { name: "Add to strategy" }),
  ).toBeDisabled();
  await bus.getByLabel("Target district").selectOption("almaty");
  await expect(
    bus.getByRole("button", { name: "Add to strategy" }),
  ).toBeEnabled();
  await bus.getByLabel("Target district").selectOption("");
  await expect(
    bus.getByRole("button", { name: "Add to strategy" }),
  ).toBeDisabled();
  await addMeasure(page, "Smart bus network", "nura");
  await expect(
    page.getByRole("complementary", { name: "Your strategy" }),
  ).toContainText("Nura · 20 credits");
  await filters
    .getByRole("button", { name: "Environment", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No initiatives found" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(search).toHaveValue("");
  await expect(page.locator(".measure-card")).toHaveCount(measures.length);
  await expect(bus.getByLabel("Target district")).toHaveValue("nura");
  await expect(
    bus.getByRole("button", { name: "Added to strategy" }),
  ).toBeDisabled();
  await expect(bus.getByLabel("Target district")).toBeDisabled();
  const cityMeasure = measureCard(page, "Digital city services");
  await expect(cityMeasure.getByRole("combobox")).toHaveCount(0);
  await addMeasure(page, "Digital city services");
  await expect(
    page.getByRole("complementary", { name: "Your strategy" }),
  ).toContainText("City-wide · 15 credits");
  await expect(page.getByLabel("Decision count")).toHaveText("2/5");
  await expect(page.locator(".budget-summary")).toContainText("65 credits");
  await page.getByRole("button", { name: "Remove Smart bus network" }).click();
  await expect(page.getByLabel("Decision count")).toHaveText("1/5");
  await expect(page.locator(".budget-summary")).toContainText("85 credits");
});

test("fixed costs prevent overspending and exactly five decisions may use the full budget", async ({
  page,
}) => {
  await page.goto("/simulation");
  await addMeasure(page, "Water network renewal", "nura");
  await addMeasure(page, "Community health centers", "baikonur");
  await addMeasure(page, "Smart bus network", "almaty");
  await addMeasure(page, "School modernization", "esil");
  await expect(page.getByLabel("Decision count")).toHaveText("4/5");
  await expect(page.locator(".budget-summary")).toContainText("5 credits");
  await expect(
    page.getByRole("button", { name: "Run Simulation", exact: true }),
  ).toBeDisabled();
  const cityMeasure = measureCard(page, "Clean city program");
  await expect(
    cityMeasure.getByRole("button", { name: "Insufficient budget" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Remove Water network renewal" })
    .click();
  await addMeasure(page, "Road maintenance", "saryarka");
  await addMeasure(page, "Clean city program");
  await expect(page.getByLabel("Decision count")).toHaveText("5/5");
  await expect(page.locator(".budget-summary")).toContainText("0 credits");
  await expect(page.locator(".budget-summary")).toContainText("100 / 100");
  await expect(
    page.getByRole("button", { name: "Run Simulation", exact: true }),
  ).toBeEnabled();
  await expect(page.getByRole("slider")).toHaveCount(0);
});
