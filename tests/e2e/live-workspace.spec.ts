import { test, expect, type Locator, type Page } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

async function expectCanvasInViewport(page: Page, canvas: Locator) {
  // Do not scroll the canvas into view: that would hide the regression this tests.
  const viewport = page.viewportSize()!;
  const box = await canvas.boundingBox();
  expect(box, "The live canvas must remain mounted").not.toBeNull();
  expect(box!.width).toBeGreaterThan(100);
  expect(box!.height).toBeGreaterThan(80);
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toHaveAttribute("data-live-test-identity", "persistent-live-city");
}

async function expectUnobscuredControl(page: Page, control: Locator) {
  const box = await control.boundingBox();
  expect(box, "The action control must have visible geometry").not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
  expect(await control.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return hit === element || (hit !== null && element.contains(hit));
  }), "The sticky city/budget panel must not cover the checkbox or district selector").toBe(true);
}

test("the live city stays beside active decisions from transport through safety", async ({ page }, testInfo) => {
  test.slow(); // Mobile scene updates can take several frames in software WebGL.
  const mobile = testInfo.project.name === "mobile";
  const viewport = mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 };
  await page.setViewportSize(viewport);
  const errors: string[] = [];
  const analyzeRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/analyze") analyzeRequests.push(request.url());
  });
  await page.goto("/");
  const workspace = page.getByTestId("live-workspace");
  const panel = page.getByTestId("live-city-panel");
  const canvas = page.getByTestId("city-3d-canvas");
  await expect(workspace).toBeVisible();
  await expect(panel).toBeVisible();

  // Start where a player chooses, not at a separate city preview above the cards.
  const firstCard = page.getByTestId("action-M1");
  await firstCard.evaluate((element) => element.scrollIntoView({ block: "start", behavior: "instant" }));
  await expect(canvas).toHaveAttribute("data-ready", "true", { timeout: 20_000 });
  expect(await canvas.evaluate((element) => Boolean((element as HTMLCanvasElement).getContext("webgl2")))).toBe(true);
  await canvas.evaluate((element) => { (element as HTMLElement).dataset.liveTestIdentity = "persistent-live-city"; });
  await expectCanvasInViewport(page, canvas);

  if (!mobile) {
    const cardBox = await firstCard.boundingBox();
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox!.x, "Desktop city must be to the right of the decision cards").toBeGreaterThanOrEqual(cardBox!.x + cardBox!.width);
  }

  for (const [actionId, districtId, featureCount] of [["M1", "esil", "1"], ["M10", "nura", "2"]] as const) {
    const card = page.getByTestId(`action-${actionId}`);
    const checkbox = card.getByRole("checkbox");
    await card.scrollIntoViewIfNeeded();
    await expectCanvasInViewport(page, canvas);
    await expectUnobscuredControl(page, checkbox);
    const scrollBeforeCheck = await page.evaluate(() => window.scrollY);
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    await expect(page.getByTestId("city-view-after")).toHaveAttribute("aria-pressed", "true");
    expect(Math.abs(await page.evaluate(() => window.scrollY) - scrollBeforeCheck), "Checking a decision must not jump back to the old city position").toBeLessThan(viewport.height / 3);

    const selector = page.getByTestId(`district-select-${actionId}`);
    // A player may scroll within a long card to reach its district selector.
    await selector.scrollIntoViewIfNeeded();
    await expectUnobscuredControl(page, selector);
    await expectCanvasInViewport(page, canvas);
    const scrollBeforeAssignment = await page.evaluate(() => window.scrollY);
    await selector.selectOption(districtId);
    await expect(selector).toHaveValue(districtId);
    await expect(canvas).toHaveAttribute("data-view", "after");
    await expect(canvas).toHaveAttribute("data-feature-count", featureCount, { timeout: 20_000 });
    await expect(canvas).toHaveAttribute("data-focused-district", districtId);
    await expectCanvasInViewport(page, canvas);
    await expectUnobscuredControl(page, selector);
    expect(Math.abs(await page.evaluate(() => window.scrollY) - scrollBeforeAssignment), "Assigning a district must update the adjacent scene without scrolling the page away").toBeLessThan(viewport.height / 3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await page.screenshot({ path: `test-results/${testInfo.project.name}-live-workspace-${actionId}.png`, fullPage: false, animations: "disabled" });
    if (actionId === "M1") {
      await page.getByTestId("city-view-before").click();
      await expect(canvas).toHaveAttribute("data-view", "before");
      await page.getByTestId("city-focus-nura").click();
      await expect(canvas).toHaveAttribute("data-focused-district", "nura");
      await expect(canvas).toHaveAttribute("data-view", "before");
      // Choosing/assigning M10 in the next iteration must restore the after view.
    }
  }

  const features = JSON.parse((await canvas.getAttribute("data-feature-districts"))!) as { id: string; actions: string[] }[];
  expect(features.find((district) => district.id === "esil")!.actions).toEqual(["M1"]);
  expect(features.find((district) => district.id === "nura")!.actions).toEqual(["M10"]);
  expect(features.filter((district) => !["esil", "nura"].includes(district.id)).every((district) => district.actions.length === 0)).toBe(true);
  await expect(page.getByTestId("action-M1").getByRole("checkbox")).toBeChecked();
  await expect(page.getByTestId("action-M10").getByRole("checkbox")).toBeChecked();
  await expect(page.getByTestId("city-live-budget")).toContainText("70");
  await expect(page.getByTestId("preview-city-score")).toHaveCount(0);
  expect(analyzeRequests).toEqual([]);
  expect(errors).toEqual([]);
});
