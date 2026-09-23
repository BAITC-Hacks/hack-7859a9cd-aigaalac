import type { Page } from "@playwright/test";
export async function addMeasure(page: Page, name: string, district?: string) {
  const card = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
  if (district) await card.getByLabel("Target district").selectOption(district);
  await card
    .getByRole("button", { name: "Add to strategy", exact: true })
    .click();
}
export async function chooseFive(page: Page) {
  await addMeasure(page, "Smart bus network", "nura");
  await addMeasure(page, "Neighborhood green spaces", "saryarka");
  await addMeasure(page, "Community health centers", "baikonur");
  await addMeasure(page, "School modernization", "almaty");
  await addMeasure(page, "Digital city services");
}
