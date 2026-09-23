import { test, expect } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

test("new projects use distinct vacant sites without removing permanent homes", async ({ page }) => {
  test.slow(); // Three complete placements, before/after and removal redraw the full city.
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  const canvas = page.getByTestId("city-3d-canvas");
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute("data-ready", "true", { timeout: 20_000 });
  const territories = JSON.parse(await canvas.getAttribute("data-district-bounds") ?? "[]") as { id: string; min: number[]; max: number[] }[];
  expect(territories).toHaveLength(5);
  for (const territory of territories) expect((territory.max[0] - territory.min[0]) * (territory.max[2] - territory.min[2])).toBeGreaterThan(800);
  const homes = await canvas.getAttribute("data-building-count");
  expect(Number(homes)).toBeGreaterThan(200);
  await expect(canvas).toHaveAttribute("data-project-plots", "20");
  expect(Number(await canvas.getAttribute("data-infill-count"))).toBeGreaterThan(0);
  for (const [id, count] of [["M4", 1], ["M8", 2], ["M12", 7]] as const) {
    await page.getByTestId(`action-${id}`).getByRole("checkbox").check();
    if (id !== "M12") await page.getByTestId(`district-select-${id}`).selectOption("nura");
    await expect(canvas).toHaveAttribute("data-feature-count", String(count));
    await expect(canvas).toHaveAttribute("data-building-count", homes!);
  }
  const plots = JSON.parse(await canvas.getAttribute("data-feature-plots") ?? "[]") as { id: string; plot: number[] }[];
  // The city service adds kiosks; only the park and clinic need vacant plots.
  expect(plots).toHaveLength(2);
  const nuraPlots = plots.filter(item => item.id.startsWith("nura:"));
  expect(nuraPlots).toHaveLength(2);
  expect(new Set(nuraPlots.map(item => JSON.stringify(item.plot))).size).toBe(2);
  await canvas.screenshot({ path: `test-results/developed-city-${test.info().project.name}.png` });
  await page.getByTestId("city-view-before").click();
  await expect(canvas).toHaveAttribute("data-feature-plots", "[]");
  await expect(canvas).toHaveAttribute("data-building-count", homes!);
  await page.getByTestId("city-view-after").click();
  await expect(canvas).toHaveAttribute("data-feature-count", "7");
  await page.getByTestId("action-M8").getByRole("checkbox").uncheck();
  await expect(canvas).toHaveAttribute("data-feature-count", "6");
  await expect(canvas).toHaveAttribute("data-building-count", homes!);
  const remaining = JSON.parse(await canvas.getAttribute("data-feature-plots") ?? "[]");
  expect(remaining).toEqual(plots.filter(item => item.id !== "nura:M8"));
  await page.getByTestId("city-focus-all").click();
  await expect(canvas).toHaveAttribute("data-focused-district", "all");
  expect(errors).toEqual([]);
});
