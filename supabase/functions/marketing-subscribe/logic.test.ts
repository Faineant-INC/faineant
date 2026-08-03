import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { MARKETING_CONSENT_VERSION as BROWSER_CONSENT_VERSION } from "../../../packages/shared/src/constants/marketing.ts";
import { marketingWelcomeEmail } from "../_shared/email-templates.ts";
import {
  createUnsubscribeToken,
  MARKETING_CONSENT_VERSION,
  parseSubscribeBody,
  verifyUnsubscribeToken,
} from "./logic.ts";

Deno.test("browser and Edge Function require the same disclosure version", () => {
  assertEquals(MARKETING_CONSENT_VERSION, BROWSER_CONSENT_VERSION);
});

Deno.test("subscription input normalizes email and requires explicit consent", () => {
  const result = parseSubscribeBody({
    email: "  Person@Example.COM ",
    marketingConsent: true,
    consentVersion: MARKETING_CONSENT_VERSION,
    website: "",
  });
  assertEquals(result.kind, "valid");
  if (result.kind === "valid") {
    assertEquals(result.input.email, "person@example.com");
  }

  assertEquals(
    parseSubscribeBody({
      email: "person@example.com",
      marketingConsent: false,
      consentVersion: MARKETING_CONSENT_VERSION,
    }).kind,
    "invalid",
  );
});

Deno.test("honeypot submissions are accepted without creating a contact", () => {
  assertEquals(
    parseSubscribeBody({
      email: "bot@example.com",
      website: "https://spam.example",
    }).kind,
    "bot",
  );
});

Deno.test("unsubscribe tokens verify and reject tampering", async () => {
  const id = "71000000-0000-0000-0000-000000000001";
  const token = await createUnsubscribeToken(id, "test-signing-secret");
  assertEquals(
    await verifyUnsubscribeToken(token, "test-signing-secret"),
    id,
  );
  assertEquals(
    await verifyUnsubscribeToken(`${token}x`, "test-signing-secret"),
    null,
  );
});

Deno.test("marketing welcome email includes brand and compliance controls", () => {
  const rendered = marketingWelcomeEmail({
    unsubscribeUrl: "https://faineantapp.com/unsubscribe?token=test",
    oneClickUnsubscribeUrl:
      "https://example.supabase.co/functions/v1/marketing-subscribe/unsubscribe?token=test",
    postalAddress: "123 Example Street, Chicago, IL 60601",
  });
  assertStringIncludes(rendered.subject, "email list");
  assertStringIncludes(rendered.html, "THIS IS AN ADVERTISEMENT");
  assertStringIncludes(rendered.html, "UNSUBSCRIBE FROM MARKETING EMAILS");
  assertStringIncludes(rendered.text, "123 Example Street");
  assert(rendered.headers);
  assertEquals(
    rendered.headers["List-Unsubscribe-Post"],
    "List-Unsubscribe=One-Click",
  );
});
