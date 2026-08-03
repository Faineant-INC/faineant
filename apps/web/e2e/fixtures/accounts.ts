export type QaAccount = {
  email: string;
  keychainService: string;
  passwordEnv: string;
};

export type QaRoleAccount = QaAccount & {
  label: string;
  homePath: string;
  forbiddenPath?: string;
  heading: RegExp;
  identity: RegExp;
};

export type QaGateAccount = QaAccount & {
  label: string;
  expectedMessage: RegExp;
};

export const QA_ROLE_ACCOUNTS: readonly QaRoleAccount[] = [
  {
    label: "active client",
    email: "qa.client@faineantapp.com",
    keychainService: "faineant-qa-client",
    passwordEnv: "QA_CLIENT_PASSWORD",
    homePath: "/dashboard",
    forbiddenPath: "/admin",
    heading: /Welcome,\s*Quinn\./i,
    identity: /Quinn Client/i,
  },
  {
    label: "verified provider",
    email: "qa.provider@faineantapp.com",
    keychainService: "faineant-qa-provider",
    passwordEnv: "QA_PROVIDER_PASSWORD",
    homePath: "/dashboard/provider/bookings",
    forbiddenPath: "/admin",
    heading: /Today.?s calendar\./i,
    identity: /Parker Provider/i,
  },
  {
    label: "pending provider",
    email: "qa.provider.pending@faineantapp.com",
    keychainService: "faineant-qa-provider-pending",
    passwordEnv: "QA_PROVIDER_PENDING_PASSWORD",
    homePath: "/dashboard/provider/bookings",
    forbiddenPath: "/admin",
    heading: /Today.?s calendar\./i,
    identity: /Peyton Pending/i,
  },
  {
    label: "administrator",
    email: "qa.admin@faineantapp.com",
    keychainService: "faineant-qa-admin",
    passwordEnv: "QA_ADMIN_PASSWORD",
    homePath: "/admin",
    heading: /House ledger\./i,
    identity: /Avery Admin/i,
  },
] as const;

export const QA_GATE_ACCOUNTS: readonly QaGateAccount[] = [
  {
    label: "unverified client",
    email: "qa.unverified@faineantapp.com",
    keychainService: "faineant-qa-unverified",
    passwordEnv: "QA_UNVERIFIED_PASSWORD",
    expectedMessage: /confirm your email before opening the door/i,
  },
  {
    label: "disabled client",
    email: "qa.disabled@faineantapp.com",
    keychainService: "faineant-qa-disabled",
    passwordEnv: "QA_DISABLED_PASSWORD",
    expectedMessage: /this account is disabled/i,
  },
] as const;
