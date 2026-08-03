import { expect, test } from "@playwright/test";
import { QA_ROLE_ACCOUNTS } from "./fixtures/accounts";
import { expectPath, submitLogin } from "./support/login";

test.describe.configure({ mode: "serial" });

test.describe("QA role journeys", () => {
  for (const account of QA_ROLE_ACCOUNTS) {
    test(`${account.label} signs in through the UI and reaches the correct workspace`, async ({
      page,
    }) => {
      await submitLogin(page, account);
      await expectPath(page, account.homePath);
      await expect(page.getByRole("heading", { name: account.heading })).toBeVisible();

      if (account.homePath !== "/admin") {
        await expect(page.getByText(account.identity).first()).toBeVisible();
      }

      if (account.forbiddenPath) {
        await page.goto(account.forbiddenPath);
        await expectPath(page, account.homePath);
      }
    });
  }

  test("client can sign out through the account menu", async ({ page }) => {
    const client = QA_ROLE_ACCOUNTS[0];
    await submitLogin(page, client);
    await expectPath(page, client.homePath);
    await page.getByRole("button", { name: /Quinn Client/i }).click();
    await page.getByRole("menuitem", { name: /Log out/i }).click();
    await expectPath(page, "/login");
    await expect(page.getByRole("heading", { name: /Open the door\./i })).toBeVisible();
  });
});
