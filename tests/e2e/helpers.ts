import type { Page } from "@playwright/test";
export const referenceDecisions = [
  { measureId: "M7", districtId: "nura" },
  { measureId: "M8", districtId: "nura" },
  { measureId: "M10", districtId: "nura" },
  { measureId: "M12", districtId: null },
  { measureId: "M5", districtId: "saryarka" },
];

export function measureCard(page: Page, id: string) {
  return page.locator(`[data-measure-id="${id}"]`);
}

export async function addMeasure(page: Page, id: string, district?: string) {
  const card = measureCard(page, id);
  if (district) await card.getByLabel("Target district").selectOption(district);
  await card
    .getByRole("button", { name: "Add to strategy", exact: true })
    .click();
}
export async function chooseFive(page: Page) {
  for (const { measureId, districtId } of referenceDecisions) {
    await addMeasure(page, measureId, districtId ?? undefined);
  }
}
