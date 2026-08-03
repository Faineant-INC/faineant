import { expect, test } from "@playwright/test";

test("approved provider and active services are visible", async ({ page }) => {
  await page.goto("/providers/qa-studio-chicago");
  await expect(page.getByRole("heading", { name: /Parker Provider\./i })).toBeVisible();
  await expect(page.getByText("Faineant QA Studio", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /QA Signature Cut/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /QA Event Makeup/i })).toBeVisible();
});

test("pending provider and inactive service stay outside public discovery", async ({ page }) => {
  const pendingResponse = await page.goto("/providers/qa-provider-pending");
  expect(pendingResponse?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();

  const inactiveResponse = await page.goto("/services/qa-express-facial-71000000");
  expect(inactiveResponse?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
});
