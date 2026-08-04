export const REQUIRED_MARKETING_SECRET_NAMES = [
  "RESEND_API_KEY",
  "EMAIL_FROM_NAME",
  "EMAIL_FROM_ADDRESS",
  "WEB_URL",
  "MARKETING_POSTAL_ADDRESS",
  "MARKETING_SIGNING_SECRET",
] as const;

export type MigrationStatus = {
  local?: string | null;
  remote?: string | null;
};

export type HostedFunction = {
  slug: string;
  status?: string | null;
  verify_jwt?: boolean | null;
};

export type HostedSecret = {
  name: string;
};

export type FunctionContract = {
  slug: string;
  verifyJwt: boolean;
};

export type HostedReleaseIssue = {
  code:
    | "missing_remote_migration"
    | "remote_only_migration"
    | "migration_mismatch"
    | "missing_function"
    | "inactive_function"
    | "verify_jwt_mismatch"
    | "missing_secret";
  target: string;
  message: string;
};

export type HostedReleaseSnapshot = {
  migrations: MigrationStatus[];
  functions: HostedFunction[];
  secrets: HostedSecret[];
  expectedFunctions: FunctionContract[];
  requiredSecretNames?: readonly string[];
};

export function configuredFunctionContracts(
  configToml: string,
): FunctionContract[] {
  const contracts = new Map<
    string,
    { enabled: boolean; verifyJwt: boolean }
  >();
  let currentSlug: string | null = null;

  for (const sourceLine of configToml.split(/\r?\n/)) {
    const line = sourceLine.trim();
    const functionHeader = line.match(/^\[functions\.([a-z0-9_-]+)\]$/i);

    if (functionHeader) {
      currentSlug = functionHeader[1];
      contracts.set(currentSlug, { enabled: true, verifyJwt: true });
      continue;
    }

    if (line.startsWith("[")) {
      currentSlug = null;
      continue;
    }

    if (!currentSlug || line.startsWith("#")) continue;
    const contract = contracts.get(currentSlug);
    if (!contract) continue;

    const enabled = line.match(/^enabled\s*=\s*(true|false)\b/i);
    if (enabled) contract.enabled = enabled[1].toLowerCase() === "true";

    const verifyJwt = line.match(/^verify_jwt\s*=\s*(true|false)\b/i);
    if (verifyJwt) {
      contract.verifyJwt = verifyJwt[1].toLowerCase() === "true";
    }
  }

  return [...contracts.entries()]
    .filter(([, contract]) => contract.enabled)
    .map(([slug, contract]) => ({ slug, verifyJwt: contract.verifyJwt }))
    .sort((left, right) => left.slug.localeCompare(right.slug));
}

export function auditHostedRelease({
  migrations,
  functions,
  secrets,
  expectedFunctions,
  requiredSecretNames = REQUIRED_MARKETING_SECRET_NAMES,
}: HostedReleaseSnapshot): HostedReleaseIssue[] {
  const issues: HostedReleaseIssue[] = [];

  for (const migration of migrations) {
    const local = migration.local?.trim() ?? "";
    const remote = migration.remote?.trim() ?? "";

    if (local && !remote) {
      issues.push({
        code: "missing_remote_migration",
        target: local,
        message:
          `Migration ${local} exists locally but is not recorded remotely.`,
      });
    } else if (!local && remote) {
      issues.push({
        code: "remote_only_migration",
        target: remote,
        message:
          `Migration ${remote} exists remotely but is not present locally.`,
      });
    } else if (local && remote && local !== remote) {
      issues.push({
        code: "migration_mismatch",
        target: `${local}/${remote}`,
        message: `Migration ledger differs: local ${local}, remote ${remote}.`,
      });
    }
  }

  const functionsBySlug = new Map(functions.map((fn) => [fn.slug, fn]));
  for (const expected of expectedFunctions) {
    const hosted = functionsBySlug.get(expected.slug);
    if (!hosted) {
      issues.push({
        code: "missing_function",
        target: expected.slug,
        message:
          `Edge Function ${expected.slug} is configured locally but missing remotely.`,
      });
      continue;
    }
    if (hosted.status !== "ACTIVE") {
      issues.push({
        code: "inactive_function",
        target: expected.slug,
        message: `Edge Function ${expected.slug} is ${
          hosted.status ?? "not active"
        }.`,
      });
    }
    if (hosted.verify_jwt !== expected.verifyJwt) {
      issues.push({
        code: "verify_jwt_mismatch",
        target: expected.slug,
        message: `Edge Function ${expected.slug} has verify_jwt=${
          String(
            hosted.verify_jwt,
          )
        }; expected ${String(expected.verifyJwt)}.`,
      });
    }
  }

  const hostedSecretNames = new Set(secrets.map((secret) => secret.name));
  for (const secretName of requiredSecretNames) {
    if (!hostedSecretNames.has(secretName)) {
      issues.push({
        code: "missing_secret",
        target: secretName,
        message: `Required Supabase secret ${secretName} is missing.`,
      });
    }
  }

  return issues;
}
