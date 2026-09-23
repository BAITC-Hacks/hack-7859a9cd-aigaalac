import { test, expect, type Page } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

async function selectAction(page: Page, id: string, districtId?: string) {
  await page.getByTestId(`action-${id}`).getByRole("checkbox").check();
  if (districtId) await page.getByTestId(`district-select-${id}`).selectOption(districtId);
  const legendToggle = page.getByTestId("city-legend-toggle");
  if (await legendToggle.isVisible() && await legendToggle.getAttribute("aria-expanded") === "false") {
    await legendToggle.click();
  }
}

async function readyCanvas(page: Page) {
  const canvas = page.getByTestId("city-3d-canvas");
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute("data-ready", "true", { timeout: 20_000 });
  return canvas;
}

async function moveCamera(page: Page, command: "reset" | "rotate-left" | "zoom-in") {
  const toggle = page.getByTestId("city-camera-toggle");
  if (await toggle.isVisible() && await toggle.getAttribute("aria-expanded") === "false") {
    await toggle.click();
  }
  await page.getByTestId(`city-camera-${command}`).click();
}

test("3D shows scoped geometry, before/after, camera controls and reversible choices without AI", async ({ page }, testInfo) => {
  test.slow(); // Camera screenshots, reassignment and GPU context recovery on mobile.
  const errors: string[] = [];
  let calls = 0;
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => { if (request.url().endsWith("/api/analyze")) calls++; });
  await page.goto("/");
  const canvas = await readyCanvas(page);
  await expect(canvas).toHaveAttribute("data-feature-count", "0");
  // WebGL must genuinely be active, not only a list of intended changes.
  expect(await canvas.evaluate((element) => Boolean((element as HTMLCanvasElement).getContext("webgl2")))).toBe(true);
  await canvas.evaluate((element) => { (element as HTMLElement).dataset.testIdentity = "original-canvas"; });

  await selectAction(page, "M7", "nura");
  await readyCanvas(page);
  await expect(canvas).toHaveAttribute("data-feature-count", "1");
  await expect(page.getByTestId("city-feature-nura-M7")).toBeVisible();
  await expect(page.getByTestId("city-feature-esil-M7")).toHaveCount(0);
  await expect(page.getByTestId("preview-city-score")).toHaveCount(0);
  await moveCamera(page, "reset");
  await page.getByTestId("city-view-before").click();
  await expect(canvas).toHaveAttribute("data-view", "before");
  await expect(canvas).toHaveAttribute("data-feature-count", "0");
  const before = await canvas.screenshot({ animations: "disabled" });
  await page.getByTestId("city-view-after").click();
  await expect(canvas).toHaveAttribute("data-view", "after");
  await expect(canvas).toHaveAttribute("data-feature-count", "1");
  const after = await canvas.screenshot({ path: `test-results/${testInfo.project.name}-3d-school.png`, animations: "disabled" });
  expect(after.equals(before)).toBe(false);
  await expect(page.getByTestId("action-M7").getByRole("checkbox")).toBeChecked();
  await expect(canvas).toHaveAttribute("data-test-identity", "original-canvas");

  await page.getByTestId("district-select-M7").selectOption("esil");
  await readyCanvas(page);
  await expect(page.getByTestId("city-feature-esil-M7")).toBeVisible();
  await expect(page.getByTestId("city-feature-nura-M7")).toHaveCount(0);
  await page.getByTestId("action-M7").getByRole("checkbox").uncheck();
  await readyCanvas(page);
  await expect(canvas).toHaveAttribute("data-feature-count", "0");
  await selectAction(page, "M2");
  await readyCanvas(page);
  await expect(canvas).toHaveAttribute("data-feature-count", "5");
  for (const district of ["esil", "almaty", "saryarka", "baikonur", "nura"])
    await expect(page.getByTestId(`city-feature-${district}-M2`)).toBeVisible();
  await page.getByTestId("city-focus-nura").click();
  await expect(canvas).toHaveAttribute("data-focused-district", "nura");
  await expect(page.getByTestId("district-card-nura")).toHaveAttribute("aria-pressed", "true");
  const cameraBefore = await canvas.screenshot({ animations: "disabled" });
  await moveCamera(page, "rotate-left");
  await moveCamera(page, "zoom-in");
  const cameraAfter = await canvas.screenshot({ animations: "disabled" });
  expect(cameraAfter.equals(cameraBefore)).toBe(false);
  await moveCamera(page, "reset");
  await expect(canvas).toHaveAttribute("data-focused-district", "all");
  await page.getByTestId("city-view-preview").screenshot({ path: `test-results/${testInfo.project.name}-3d-city.png`, animations: "disabled" });
  // Losing a GPU context must not erase the user's decisions; retry creates a fresh scene.
  expect(await canvas.evaluate((element) => {
    const extension = (element as HTMLCanvasElement).getContext("webgl2")?.getExtension("WEBGL_lose_context");
    extension?.loseContext();
    return Boolean(extension);
  })).toBe(true);
  await expect(page.getByTestId("city-3d-fallback")).toBeVisible();
  await expect(page.getByTestId("action-M2").getByRole("checkbox")).toBeChecked();
  await page.getByTestId("city-3d-retry").click();
  const recovered = await readyCanvas(page);
  await expect(recovered).toHaveAttribute("data-feature-count", "5");
  await expect(recovered).not.toHaveAttribute("data-test-identity", "original-canvas");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(calls).toBe(0);
  expect(errors).toEqual([]);
});

test("all fourteen measures produce renderable 3D features and invalid targeting restores baseline", async ({ page }, testInfo) => {
  test.setTimeout(240_000); // Fourteen complete choice → render → removal cycles, including mobile WebGL.
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const canvas = await readyCanvas(page);
  const cityActions = new Set(["M2", "M6", "M12", "M14"]);
  for (let number = 1; number <= 14; number++) {
    const id = `M${number}`;
    await selectAction(page, id, cityActions.has(id) ? undefined : "nura");
    await readyCanvas(page);
    await expect(canvas).toHaveAttribute("data-feature-count", cityActions.has(id) ? "5" : "1");
    await expect(page.getByTestId(`city-feature-nura-${id}`)).toBeVisible();
    if (testInfo.project.name === "desktop" && ["M3", "M4", "M7", "M10", "M12"].includes(id)) {
      await page.getByTestId("city-focus-nura").click();
      await canvas.screenshot({ path: `test-results/3d-detail-${id}.png`, animations: "disabled" });
    }
    await page.getByTestId(`action-${id}`).getByRole("checkbox").uncheck();
  }
  await selectAction(page, "M7");
  await readyCanvas(page);
  await expect(canvas).toHaveAttribute("data-feature-count", "0");
  await expect(page.getByTestId("city-view-preview")).toContainText("аудан");
  await expect(page.getByRole("button", { name: "Растау", exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});

test("missing WebGL has an accessible fallback and never blocks choosing a plan", async ({ page }) => {
  await page.addInitScript(() => {
    const prototype = HTMLCanvasElement.prototype as unknown as { getContext: (this: HTMLCanvasElement, type: string, ...args: unknown[]) => unknown };
    const original = prototype.getContext;
    prototype.getContext = function (type, ...args) {
      if (type.includes("webgl")) return null;
      return original.call(this, type, ...args);
    };
  });
  await page.goto("/");
  await expect(page.getByTestId("city-3d-fallback")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("city-3d-retry")).toBeEnabled();
  await selectAction(page, "M7", "nura");
  await expect(page.getByTestId("city-feature-nura-M7")).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(14);
  await expect(page.getByTestId("district-metric-S1")).toContainText("48.00");
  await expect(page.getByRole("button", { name: "Растау", exact: true })).toBeDisabled();
});
