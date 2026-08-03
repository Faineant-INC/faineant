import { expect, test } from "@playwright/test";
import { QA_GATE_ACCOUNTS } from "./fixtures/accounts";
import { expectPath, submitLogin } from "./support/login";

test.describe.configure({ mode: "serial" });

test.describe("QA authentication gates", () => {
  for (const account of QA_GATE_ACCOUNTS) {
    test(`${account.label} is blocked with the intended message`, async ({ page }) => {
      await submitLogin(page, account);
      await expectPath(page, "/login");
      const accountAlert = page.getByRole("alert").filter({ hasText: account.expectedMessage });
      await expect(accountAlert).toHaveText(account.expectedMessage);
    });
  }
});
