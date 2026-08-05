import { deepStrictEqual as assertEquals } from "node:assert/strict";
import {
  auditHostedRelease,
  configuredFunctionContracts,
  type FunctionContract,
} from "./hosted-release-contract.ts";

const marketingFunction: FunctionContract = {
  slug: "marketing-subscribe",
  verifyJwt: false,
};

Deno.test("hosted release audit catches the production waitlist drift", () => {
  const issues = auditHostedRelease({
    migrations: [{ local: "20260803124545", remote: "" }],
    functions: [],
    secrets: [
      { name: "RESEND_API_KEY" },
      { name: "EMAIL_FROM_NAME" },
      { name: "EMAIL_FROM_ADDRESS" },
      { name: "WEB_URL" },
    ],
    expectedFunctions: [marketingFunction],
  });

  assertEquals(
    issues.map(({ code, target }) => `${code}:${target}`),
    [
      "missing_remote_migration:20260803124545",
      "missing_function:marketing-subscribe",
      "missing_secret:MARKETING_POSTAL_ADDRESS",
      "missing_secret:MARKETING_SIGNING_SECRET",
    ],
  );
});

Deno.test("hosted release audit accepts a complete marketing deployment", () => {
  const issues = auditHostedRelease({
    migrations: [{ local: "20260803124545", remote: "20260803124545" }],
    functions: [
      {
        slug: "marketing-subscribe",
        status: "ACTIVE",
        verify_jwt: false,
      },
    ],
    secrets: [
      { name: "RESEND_API_KEY" },
      { name: "EMAIL_FROM_NAME" },
      { name: "EMAIL_FROM_ADDRESS" },
      { name: "WEB_URL" },
      { name: "MARKETING_POSTAL_ADDRESS" },
      { name: "MARKETING_SIGNING_SECRET" },
    ],
    expectedFunctions: [marketingFunction],
  });

  assertEquals(issues, []);
});

Deno.test("hosted release audit catches unsafe JWT gateway drift", () => {
  const issues = auditHostedRelease({
    migrations: [],
    functions: [
      {
        slug: "marketing-subscribe",
        status: "ACTIVE",
        verify_jwt: true,
      },
    ],
    secrets: [],
    expectedFunctions: [marketingFunction],
    requiredSecretNames: [],
  });

  assertEquals(issues.map(({ code }) => code), ["verify_jwt_mismatch"]);
});

Deno.test("function contracts are read from enabled config sections", () => {
  const contracts = configuredFunctionContracts(`
[functions.marketing-subscribe]
enabled = true
verify_jwt = false

[functions.disabled-example]
enabled = false
verify_jwt = false

[functions.jwt-default]
enabled = true
`);

  assertEquals(contracts, [
    { slug: "jwt-default", verifyJwt: true },
    { slug: "marketing-subscribe", verifyJwt: false },
  ]);
});
