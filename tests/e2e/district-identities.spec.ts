import { test, expect, type Locator } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

// Expected landmarks are independent of the application's catalog so a swapped
// district label or a missing rendered model fails the same browser regression.
const identities = [
  { districtId: "esil", districtName: "Есіл", kind: "expo", name: "ЭКСПО · «Нұр Әлем»" },
  { districtId: "almaty", districtName: "Алматы", kind: "zheruyik", name: "«Жерұйық» саябағы" },
  { districtId: "saryarka", districtName: "Сарыарқа", kind: "station", name: "«Астана-1» вокзалы" },
  { districtId: "baikonur", districtName: "Байқоңыр", kind: "palace", name: "«Жастар» сарайы" },
  { districtId: "nura", districtName: "Нұра", kind: "khan-shatyr", name: "«Хан Шатыр»" },
];

type RenderedLandmark = { districtId: string; kind: string; name: string };

async function expectPermanentLandmarks(canvas: Locator) {
  await expect.poll(async () => {
    const landmarks = JSON.parse(await canvas.getAttribute("data-landmarks") ?? "[]") as RenderedLandmark[];
    return landmarks.sort((a, b) => a.districtId.localeCompare(b.districtId));
  }, { message: "The rendered scene must retain all five district landmarks" }).toEqual(
    identities.map(({ districtId, kind, name }) => ({ districtId, kind, name }))
      .sort((a, b) => a.districtId.localeCompare(b.districtId)),
  );
}

test("district landmarks stay identifiable before, after and without a local project", async ({ page }, testInfo) => {
  test.slow(); // Five district screenshots and a complete reversible school choice.
  await page.setViewportSize(testInfo.project.name === "mobile"
    ? { width: 390, height: 844 }
    : { width: 1440, height: 1000 });
  const errors: string[] = [];
  let analyzeRequests = 0;
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/analyze", async (route) => {
    analyzeRequests++;
    await route.abort();
  });

  await page.goto("/");
  await page.getByTestId("action-M1").evaluate((element) => element.scrollIntoView({ block: "start", behavior: "instant" }));
  const canvas = page.getByTestId("city-3d-canvas");
  const badge = page.getByTestId("city-district-identity");
  const budget = page.getByTestId("city-live-budget");
  await expect(canvas).toHaveAttribute("data-ready", "true", { timeout: 20_000 });
  expect(await canvas.evaluate((element) => Boolean((element as HTMLCanvasElement).getContext("webgl2")))).toBe(true);
  await expectPermanentLandmarks(canvas);
  await expect(canvas).toHaveAttribute("data-feature-count", "0");
  await expect(canvas).toHaveAttribute("data-action-count", "0");
  const initialBudget = await budget.innerText();

  for (const { districtId, districtName, name } of identities) {
    const focus = page.getByTestId(`city-focus-${districtId}`);
    await focus.click();
    await expect(focus).toHaveAttribute("aria-pressed", "true");
    await expect(canvas).toHaveAttribute("data-focused-district", districtId);
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText(`${districtName} · ${name}`);
    await expectPermanentLandmarks(canvas);
    await page.getByTestId("city-view-preview").screenshot({
      path: `test-results/${testInfo.project.name}-district-identity-${districtId}.png`,
      animations: "disabled",
    });
  }
  expect(await budget.innerText(), "Looking at landmarks must not consume budget or decisions").toBe(initialBudget);
  await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(0);

  const cameraToggle = page.getByTestId("city-camera-toggle");
  const compactCamera = await cameraToggle.isVisible();
  if (compactCamera) {
    await expect(cameraToggle).toHaveAttribute("aria-expanded", "false");
    await cameraToggle.click();
    await expect(page.getByTestId("city-camera-zoom-in")).toBeVisible();
  }

  const school = page.getByTestId("action-M7").getByRole("checkbox");
  await school.check();
  await page.getByTestId("district-select-M7").selectOption("nura");
  if (compactCamera) await expect(cameraToggle).toHaveAttribute("aria-expanded", "false");
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute("data-view", "after");
  await expect(canvas).toHaveAttribute("data-feature-count", "1");
  await expect(canvas).toHaveAttribute("data-action-count", "1");
  await expect(canvas).toHaveAttribute("data-focused-district", "nura");
  await expect(badge).toHaveText("Нұра · «Хан Шатыр»");
  await expectPermanentLandmarks(canvas);
  const features = JSON.parse((await canvas.getAttribute("data-feature-districts"))!) as { id: string; actions: string[] }[];
  expect(features.filter((district) => district.actions.length > 0)).toEqual([{ id: "nura", actions: ["M7"] }]);
  const schoolBudget = await budget.innerText();
  expect(schoolBudget).toMatch(/Қалды\s*76/);
  await expect(page.getByTestId("preview-city-score")).toHaveCount(0);

  await page.getByTestId("city-view-before").click();
  await expect(canvas).toHaveAttribute("data-view", "before");
  await expect(canvas).toHaveAttribute("data-feature-count", "0");
  await expectPermanentLandmarks(canvas);
  await expect(badge).toHaveText("Нұра · «Хан Шатыр»");
  await expect(school).toBeChecked();
  expect(await budget.innerText()).toBe(schoolBudget);

  await page.getByTestId("city-view-after").click();
  await expect(canvas).toHaveAttribute("data-view", "after");
  await expect(canvas).toHaveAttribute("data-feature-count", "1");
  await expectPermanentLandmarks(canvas);
  await school.uncheck();
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute("data-feature-count", "0");
  await expect(canvas).toHaveAttribute("data-action-count", "0");
  await expectPermanentLandmarks(canvas);
  await expect(badge).toHaveText("Нұра · «Хан Шатыр»");
  expect(await budget.innerText()).toBe(initialBudget);
  await expect(canvas).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(analyzeRequests).toBe(0);
  expect(errors).toEqual([]);
});
