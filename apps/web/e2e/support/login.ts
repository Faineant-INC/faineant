import { expect, type Page } from "@playwright/test";
import type { QaAccount } from "../fixtures/accounts";
import { passwordFor } from "./credentials";

export async function submitLogin(page: Page, account: QaAccount): Promise<void> {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /Open the door\./i })).toBeVisible();
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(passwordFor(account));
  await page.getByRole("button", { name: /^Sign in/i }).click();
}

export async function expectPath(page: Page, pathname: string): Promise<void> {
  await expect.poll(() => new URL(page.url()).pathname).toBe(pathname);
}
