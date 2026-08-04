import {
  auditHostedRelease,
  configuredFunctionContracts,
  type HostedFunction,
  type HostedSecret,
  type MigrationStatus,
} from "../functions/_shared/hosted-release-contract.ts";

type JsonRecord = Record<string, unknown>;

const decoder = new TextDecoder();

async function runSupabase(args: string[]): Promise<unknown> {
  const command = new Deno.Command("pnpm", {
    args: ["exec", "supabase", ...args, "--output-format", "json"],
    stdout: "piped",
    stderr: "piped",
  });
  const result = await command.output();

  if (!result.success) {
    const detail = decoder.decode(result.stderr).trim();
    throw new Error(detail || `Supabase CLI exited with code ${result.code}.`);
  }

  const output = decoder.decode(result.stdout).trim();
  try {
    return JSON.parse(output);
  } catch {
    throw new Error("Supabase CLI did not return valid JSON.");
  }
}

function wrappedArray<T>(payload: unknown, key: string): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const value = (payload as JsonRecord)[key];
    if (Array.isArray(value)) return value as T[];
  }
  throw new Error(`Supabase CLI response did not contain ${key}.`);
}

async function linkedProjectRef(): Promise<string> {
  const fromEnvironment = Deno.env.get("SUPABASE_PROJECT_REF")?.trim();
  if (fromEnvironment) return fromEnvironment;

  try {
    return (await Deno.readTextFile("supabase/.temp/project-ref")).trim();
  } catch {
    throw new Error(
      "Set SUPABASE_PROJECT_REF or run `pnpm exec supabase link --project-ref <ref>` first.",
    );
  }
}

async function main(): Promise<void> {
  const projectRef = await linkedProjectRef();
  const configToml = await Deno.readTextFile("supabase/config.toml");
  const expectedFunctions = configuredFunctionContracts(configToml);

  const [migrationPayload, functionPayload, secretPayload] = await Promise.all([
    runSupabase(["migration", "list", "--linked"]),
    runSupabase(["functions", "list", "--project-ref", projectRef]),
    runSupabase(["secrets", "list", "--project-ref", projectRef]),
  ]);

  const issues = auditHostedRelease({
    migrations: wrappedArray<MigrationStatus>(migrationPayload, "migrations"),
    functions: wrappedArray<HostedFunction>(functionPayload, "functions"),
    secrets: wrappedArray<HostedSecret>(secretPayload, "secrets"),
    expectedFunctions,
  });

  if (issues.length > 0) {
    console.error("Hosted Supabase release verification failed:");
    for (const issue of issues) console.error(`- ${issue.message}`);
    Deno.exit(1);
  }

  console.log(
    `Hosted Supabase release verified: migrations match, ${expectedFunctions.length} functions are active, and required marketing secrets are present.`,
  );
}

if (import.meta.main) {
  await main();
}
