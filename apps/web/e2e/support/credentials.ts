import { execFileSync } from "node:child_process";
import type { QaAccount } from "../fixtures/accounts";

const cache = new Map<string, string>();

export function passwordFor(account: QaAccount): string {
  const cached = cache.get(account.email);
  if (cached) return cached;

  const environmentPassword = process.env[account.passwordEnv]?.trim();
  if (environmentPassword) {
    cache.set(account.email, environmentPassword);
    return environmentPassword;
  }

  if (process.platform === "darwin") {
    const keychainAccount = process.env.QA_KEYCHAIN_ACCOUNT?.trim() || "faineant";
    try {
      const password = execFileSync(
        "/usr/bin/security",
        ["find-generic-password", "-a", keychainAccount, "-s", account.keychainService, "-w"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      ).trim();
      if (password) {
        cache.set(account.email, password);
        return password;
      }
    } catch {
      // Fall through to the secret-safe setup error below.
    }
  }

  throw new Error(
    `Missing credential for ${account.email}. Set ${account.passwordEnv} or add macOS Keychain service ${account.keychainService}.`,
  );
}
