import { test, expect, type Page } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

const reference = [
  { actionId: "M7", districtId: "nura" },
  { actionId: "M1", districtId: "nura" },
  { actionId: "M10", districtId: "nura" },
  { actionId: "M12" },
  { actionId: "M5", districtId: "saryarka" },
];

async function choose(page: Page, actionId: string, districtId?: string) {
  await page.getByTestId(`action-${actionId}`).getByRole("checkbox").check();
  if (districtId) await page.getByTestId(`district-select-${actionId}`).selectOption(districtId);
}

test("14 measures, district assignments, live local preview, reference result and restart", async ({ page }, testInfo) => {
  test.slow(); // Full selection, two results and screenshots redraw the 3D city.
  const errors: string[] = [];
  let analysisRequests = 0;
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => { if (request.url().endsWith("/api/analyze")) analysisRequests++; });
  await page.goto("/");
  await expect(page.getByRole("checkbox")).toHaveCount(14);
  await expect(page.getByRole("radio")).toHaveCount(0);
  await expect(page.locator(".district-card")).toHaveCount(5);
  await expect(page.locator(".district-metric-row")).toHaveCount(10);
  await expect(page.getByTestId("preview-city-score")).toHaveCount(0);
  const confirm = page.getByRole("button", { name: "Растау", exact: true });
  await expect(confirm).toBeDisabled();
  await choose(page, "M7");
  await expect(page.getByTestId("district-preview-status")).toContainText("Болжам есептелмеді");
  await expect(page.getByTestId("preview-city-score")).toHaveCount(0);
  await page.getByTestId("district-select-M7").selectOption("nura");
  await page.getByTestId("district-card-nura").click();
  await expect(page.getByTestId("district-metric-S1")).toContainText("48.00");
  await expect(page.getByTestId("district-metric-S2")).toContainText("35.00");
  await expect(page.getByTestId("preview-city-score")).toHaveCount(0);
  for (const decision of reference) await choose(page, decision.actionId, decision.districtId);
  await expect(page.locator("input:checked")).toHaveCount(5);
  await expect(page.getByTestId("district-select-M12")).toHaveCount(0);
  await expect(page.getByTestId("action-M12")).toContainText("Бес ауданның бәріне әсер етеді");
  await expect(confirm).toBeEnabled();
  await expect(page.getByTestId("preview-city-score")).toHaveText("55.61");
  await expect(page.getByTestId("critical-count")).toHaveText("2 → 1");
  await page.getByTestId("district-card-nura").click();
  await expect(page.getByTestId("district-synergies")).toContainText("M10 + M12");
  expect(analysisRequests).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: `test-results/${testInfo.project.name}-selection.png`, fullPage: true, animations: "disabled" });
  await page.locator("#social").screenshot({ path: `test-results/${testInfo.project.name}-assignments.png`, animations: "disabled" });
  const finished = page.waitForResponse((response) => response.url().endsWith("/api/analyze") && response.status() === 200);
  await confirm.click();
  const payload = await (await finished).json();
  expect(payload.result.totalCost).toBe(93);
  expect(payload.result.after.score).toBeCloseTo(55.61002, 5);
  expect(payload.result.synergies).toHaveLength(1);
  await expect(page.getByTestId("final-score")).toContainText("55.61");
  await expect(page.getByTestId("district-explorer-result")).toBeVisible();
  await page.getByTestId("district-card-nura").click();
  await expect(page.getByTestId("district-details-nura")).toContainText("16%");
  await expect(page.getByTestId("district-metric-S2")).toContainText("35.00");
  await expect(page.getByTestId("district-synergies")).toContainText("M10 + M12");
  await expect(page.getByText("Есеп дайын, талдау күтілуде")).toBeVisible();
  await page.screenshot({ path: `test-results/${testInfo.project.name}-result.png`, fullPage: true, animations: "disabled" });
  await page.getByTestId("district-explorer-result").screenshot({ path: `test-results/${testInfo.project.name}-districts.png`, animations: "disabled" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.getByRole("button", { name: "AI талдауын қайталау" }).click();
  await expect(page.getByRole("button", { name: "AI талдауын қайталау" })).toBeEnabled();
  await expect(page.getByTestId("final-score")).toContainText("55.61");
  await page.getByRole("button", { name: "Қайта бастау" }).click();
  await expect(page.locator("input:checked")).toHaveCount(0);
  await expect(page.getByTestId("preview-city-score")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("one choice per category and budget are enforced before selection; conflicts block confirmation", async ({ page }) => {
  test.slow(); // Includes removals, reassignment and a second complete plan.
  await page.goto("/");
  const confirm = page.getByRole("button", { name: "Растау", exact: true });
  await choose(page, "M1", "esil");
  await expect(page.getByTestId("action-M3").getByRole("checkbox")).toBeDisabled();
  await expect(page.getByTestId("action-M2")).toContainText("Ауыстыру үшін");
  await expect(confirm).toBeDisabled();
  await page.getByTestId("action-M1").getByRole("checkbox").uncheck();
  await expect(page.getByTestId("action-M3").getByRole("checkbox")).toBeEnabled();
  await choose(page, "M4", "nura");
  await choose(page, "M7", "nura");
  await expect(page.locator("#selection-reason")).toContainText("жер теліміне таласады");
  await expect(confirm).toBeDisabled();
  await page.getByTestId("district-select-M7").selectOption("esil");
  await expect(page.getByTestId("district-preview-status")).not.toContainText("Болжам есептелмеді");
  await expect(page.getByTestId("preview-city-score")).toHaveCount(0);
  await page.reload();
  for (const [id, district] of [["M3", "esil"], ["M5", "saryarka"], ["M7", "nura"], ["M10", "nura"]]) await choose(page, id, district);
  await expect(page.getByTestId("action-M12").getByRole("checkbox")).toBeDisabled();
  await expect(page.getByTestId("action-M12")).toContainText("Тағы 5 бірлік қажет");
  await expect(page.locator("input:checked")).toHaveCount(4);
  await expect(confirm).toBeDisabled();
  await page.getByTestId("action-M3").getByRole("checkbox").uncheck();
  await expect(page.getByTestId("action-M12").getByRole("checkbox")).toBeEnabled();
  await choose(page, "M1", "nura");
  await choose(page, "M12");
  await expect(confirm).toBeEnabled();
});

test("a real catalog plan can spend exactly 100", async ({ page }) => {
  test.slow(); // Five 3D updates, including two city-wide projects.
  await page.goto("/");
  for (const [id, district] of [["M3", "nura"], ["M7", "nura"], ["M6", undefined], ["M11", "nura"], ["M14", undefined]]) await choose(page, id!, district);
  await expect(page.getByTestId("city-live-budget")).toContainText("Қалды0");
  await expect(page.getByRole("button", { name: "Растау", exact: true })).toBeEnabled();
});

test("structured AI sections render safe Kazakh text", async ({ page }) => {
  test.slow(); // Complete selection and result rendering on mobile.
  await page.route("**/api/analyze", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    data.analysis = { status: "complete", explanation: {
      strengths: ["Нұрадағы әлеуметтік көрсеткіштер жақсарды."],
      tradeoffs: ["Бастамалардың толық әсеріне уақыт қажет."],
      recommendations: ["<script>window.compromised=true</script>"],
    } };
    await route.fulfill({ response, json: data });
  });
  await page.goto("/");
  for (const decision of reference) await choose(page, decision.actionId, decision.districtId);
  await page.getByRole("button", { name: "Растау", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Күшті жақтары" })).toBeVisible();
  await expect(page.getByText("Нұрадағы әлеуметтік көрсеткіштер жақсарды.")).toBeVisible();
  await expect(page.getByText("<script>window.compromised=true</script>")).toBeVisible();
  expect(await page.evaluate(() => "compromised" in window)).toBe(false);
});

test("API rejects malformed, tampered, duplicate, missing district and invalid plans", async ({ request }) => {
  expect((await request.post("/api/analyze", { data: "{", headers: { "Content-Type": "application/json" } })).status()).toBe(400);
  for (const data of [
    { decisions: reference, budget: 1000 },
    { selectedIds: ["M7", "M8", "M10", "M12", "M5"] },
    { decisions: [] },
    { decisions: reference.map((decision) => decision.actionId === "M1" ? { actionId: "M8", districtId: "nura" } : decision) },
    { decisions: reference.slice(0, 4) },
    { decisions: [...reference, { actionId: "M14" }] },
    { decisions: reference.map((decision, index) => index === 0 ? { actionId: "unknown" } : decision) },
    { decisions: reference.map((decision, index) => index === 0 ? { actionId: "M7" } : decision) },
    { decisions: reference.map((decision, index) => index === 0 ? { actionId: "M7", districtId: "unknown" } : decision) },
    { decisions: reference.map((decision, index) => index === 3 ? { actionId: "M12", districtId: "nura" } : decision) },
    { decisions: [reference[0], reference[0], ...reference.slice(2)] },
    { decisions: [{ actionId: "M1", districtId: "esil" }, { actionId: "M3", districtId: "nura" }, ...reference.slice(2)] },
    { decisions: [{ actionId: "M3", districtId: "esil" }, { actionId: "M5", districtId: "saryarka" }, { actionId: "M7", districtId: "nura" }, { actionId: "M13", districtId: "almaty" }, { actionId: "M12" }] },
  ]) {
    const response = await request.post("/api/analyze", { data });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toBeTruthy();
  }
});

test("editing preserves choices, saved A/B plans compare and survive reload", async ({ page }, testInfo) => {
  test.slow();
  await page.goto("/");
  for (const decision of reference) await choose(page, decision.actionId, decision.districtId);
  await page.getByRole("button", { name: "Растау", exact: true }).click();
  await expect(page.getByTestId("final-score")).toContainText("55.61");
  await page.getByRole("button", { name: "A: нәтижені сақтау", exact: true }).click();
  await expect(page.getByTestId("scenario-score-A")).toHaveText("55.61");
  await page.getByRole("button", { name: "Жоспарды өзгерту", exact: true }).click();
  await expect(page.locator("input:checked")).toHaveCount(5);
  await expect(page.getByTestId("district-select-M7")).toHaveValue("nura");
  await page.getByTestId("district-select-M7").selectOption("esil");
  await page.getByRole("button", { name: "Растау", exact: true }).click();
  await expect(page.getByTestId("final-score")).not.toContainText("55.61");
  const bScore = await page.getByTestId("final-score").innerText();
  await page.getByRole("button", { name: "B: нәтижені сақтау", exact: true }).click();
  await expect(page.getByTestId("comparison-score-difference")).not.toHaveText("0.00");
  await expect(page.getByTestId("scenario-score-A")).toHaveText("55.61");
  expect(bScore).toContain(await page.getByTestId("scenario-score-B").innerText());
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.getByTestId("scenario-comparison").screenshot({ path: `test-results/${testInfo.project.name}-comparison.png`, animations: "disabled" });
  await page.reload();
  await expect(page.getByTestId("scenario-score-A")).toHaveText("55.61");
  await expect(page.getByTestId("comparison-score-difference")).not.toHaveText("0.00");
  await page.getByRole("button", { name: "A: жоспарды ашу", exact: true }).click();
  await expect(page.locator("input:checked")).toHaveCount(5);
  await expect(page.getByTestId("district-select-M7")).toHaveValue("nura");
  await expect(page.getByRole("button", { name: "Растау", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "A: өшіру", exact: true }).click();
  await page.reload();
  await expect(page.getByTestId("scenario-score-A")).toHaveCount(0);
  await expect(page.getByTestId("scenario-score-B")).toBeVisible();
});

test("invalid saved choices are discarded without breaking the simulator", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("akim-scenarios-five-directions-v1", JSON.stringify([[{ actionId: "fake", cost: 0 }], null])));
  await page.goto("/");
  await expect(page.getByTestId("scenario-comparison")).toContainText("Қазіргі ережелерге сай келмейтін");
  await expect(page.getByTestId("scenario-score-A")).toHaveCount(0);
  await choose(page, "M7", "nura");
  await expect(page.getByTestId("district-select-M7")).toHaveValue("nura");
});
