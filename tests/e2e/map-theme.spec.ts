import { test, expect } from "@playwright/test";

test("theme persists and map district navigation updates the dashboard", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/simulation");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const dock = page.getByRole("group", { name: "Explore a district" });
  const esil = dock.getByRole("button", { name: /Esil/ });
  await esil.hover();
  await expect(page.locator(".map-info-title")).toHaveText("Esil");
  await esil.click();
  await expect(
    page.getByRole("heading", { name: "Esil at a glance" }),
  ).toBeVisible();
  await expect(esil).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("button", { name: "Reset map view", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await page
    .locator(".city-explorer")
    .screenshot({ path: "/tmp/akim-dark-explorer.png" });
  await page.screenshot({
    path: "/tmp/akim-dark-dashboard.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(
    page.getByRole("button", { name: "Reset map view", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await page.screenshot({
    path: "/tmp/akim-light-landing.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("3D map loads, camera controls work and buildings expose hover details", async ({
  page,
}) => {
  await page.goto("/simulation");
  const reset = page.getByRole("button", {
    name: "Reset map view",
    exact: true,
  });
  await expect(reset).toBeEnabled({ timeout: 30000 });
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await page
    .getByRole("button", { name: "Toggle 2D / 3D view", exact: true })
    .click();
  await expect(page.locator(".map-view-label")).toHaveText("2D VIEW");
  await reset.click();
  await expect(page.locator(".map-view-label")).toHaveText("3D VIEW");
  await page
    .locator(".map-viewport")
    .screenshot({ path: "/tmp/akim-map-3d.png" });
  const canvas = await page.locator(".maplibregl-canvas").boundingBox();
  if (!canvas) throw new Error("Map canvas unavailable");
  // Sample the visible city rather than relying on a particular map tile's building ID.
  let found = false;
  for (let y = 100; y < canvas.height - 65 && !found; y += 30) {
    for (let x = 80; x < canvas.width - 70 && !found; x += 30) {
      await page.mouse.move(canvas.x + x, canvas.y + y);
      found = await page.locator(".building-tooltip").isVisible();
    }
  }
  expect(
    found,
    "At least one visible building provides hover information",
  ).toBe(true);
  await page.getByRole("button", { name: "Show all five districts" }).click();
  await expect(page.locator(".district-map-pin")).toHaveCount(5);
});

test("map failure keeps district information usable on mobile", async ({
  page,
}) => {
  await page.route("https://tiles.openfreemap.org/**", (route) =>
    route.abort(),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/simulation");
  await expect(page.getByText("The city map couldn’t load")).toBeVisible({
    timeout: 25000,
  });
  await page
    .getByRole("group", { name: "Explore a district" })
    .getByRole("button", { name: /Saryarka/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Saryarka at a glance" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator(".district-card").first()).toHaveCSS(
    "background-color",
    "rgb(21, 36, 44)",
  );
  await page
    .locator(".city-explorer")
    .screenshot({
      path: "/tmp/akim-mobile-explorer.png",
      animations: "disabled",
    });
  await page.screenshot({
    path: "/tmp/akim-mobile-dark.png",
    fullPage: true,
    animations: "disabled",
  });
});
