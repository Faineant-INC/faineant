import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { RenderedEmail } from "../_shared/email-templates.ts";
import { createMarketingHandler, type MarketingConfig } from "./handler.ts";
import { MARKETING_CONSENT_VERSION } from "./logic.ts";
import type { ConsentWrite, MarketingRecord, MarketingStore } from "./store.ts";

class MemoryStore implements MarketingStore {
  record: MarketingRecord | null = null;
  lastConsent: ConsentWrite | null = null;
  lastEmailError: string | null = null;

  countRecentConsentsByIpHash(): Promise<number> {
    return Promise.resolve(0);
  }
  findByEmail(email: string): Promise<MarketingRecord | null> {
    return Promise.resolve(this.record?.email === email ? this.record : null);
  }
  findById(id: string): Promise<MarketingRecord | null> {
    return Promise.resolve(this.record?.id === id ? this.record : null);
  }
  create(input: ConsentWrite): Promise<MarketingRecord> {
    this.lastConsent = input;
    this.record = {
      id: "71000000-0000-0000-0000-000000000001",
      email: input.email,
      marketing_status: input.marketing_status,
      consent_at: input.consent_at,
      consent_version: input.consent_version,
      consent_source: input.consent_source,
      welcome_email_sent_at: null,
    };
    return Promise.resolve(this.record);
  }
  resubscribe(id: string, input: ConsentWrite): Promise<MarketingRecord> {
    this.record = null;
    return this.create(input).then((record) => {
      this.record = { ...record, id };
      return this.record;
    });
  }
  markWelcomeSent(_id: string, sentAt: string): Promise<void> {
    if (this.record) this.record.welcome_email_sent_at = sentAt;
    this.lastEmailError = null;
    return Promise.resolve();
  }
  markEmailError(_id: string, message: string): Promise<void> {
    this.lastEmailError = message;
    return Promise.resolve();
  }
  unsubscribe(_id: string, _unsubscribedAt: string): Promise<void> {
    if (this.record) this.record.marketing_status = "unsubscribed";
    return Promise.resolve();
  }
}

const config: MarketingConfig = {
  resendApiKey: "re_test",
  from: "Faineant <noreply@faineantapp.com>",
  supabaseUrl: "https://example.supabase.co",
  siteUrl: "https://faineantapp.com",
  postalAddress: "123 Example Street, Chicago, IL 60601",
  signingSecret: "test-signing-secret-with-at-least-32-bytes",
  allowedOrigins: [],
};

function subscribeRequest(): Request {
  return new Request(
    "https://example.supabase.co/functions/v1/marketing-subscribe",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://faineantapp.com",
        "user-agent": "Faineant test browser",
        "x-forwarded-for": "203.0.113.4",
      },
      body: JSON.stringify({
        email: "Person@Example.com",
        marketingConsent: true,
        consentVersion: MARKETING_CONSENT_VERSION,
        referrer: "https://example.com",
        website: "",
      }),
    },
  );
}

Deno.test("subscribe records consent and sends one compliant welcome email", async () => {
  const store = new MemoryStore();
  const sent: Array<{ to: string; rendered: RenderedEmail }> = [];
  const handler = createMarketingHandler({
    store,
    config,
    now: () => new Date("2026-08-03T12:00:00.000Z"),
    sendEmail: async (_key, _from, to, rendered) => {
      sent.push({ to, rendered });
      return { id: "email_1" };
    },
  });

  const response = await handler(subscribeRequest());
  assertEquals(response.status, 200);
  assertEquals((await response.json()).subscribed, true);
  assertEquals(store.lastConsent?.email, "person@example.com");
  assertEquals(store.lastConsent?.consent_version, MARKETING_CONSENT_VERSION);
  assert(store.lastConsent?.ip_hash);
  assertEquals(sent.length, 1);
  assertEquals(sent[0].to, "person@example.com");
  assertStringIncludes(
    sent[0].rendered.headers?.["List-Unsubscribe"] ?? "",
    "/unsubscribe?token=",
  );

  const duplicate = await handler(subscribeRequest());
  assertEquals(duplicate.status, 200);
  assertEquals((await duplicate.json()).subscribed, true);
  assertEquals(sent.length, 1);
});

Deno.test("short signing secrets fail closed before consent is stored", async () => {
  const store = new MemoryStore();
  const handler = createMarketingHandler({
    store,
    config: { ...config, signingSecret: "too-short" },
    sendEmail: async () => ({ id: "unused" }),
  });
  const response = await handler(subscribeRequest());
  assertEquals(response.status, 503);
  assertEquals(store.record, null);
});

Deno.test("one-click unsubscribe is idempotent and token protected", async () => {
  const store = new MemoryStore();
  const sent: RenderedEmail[] = [];
  const handler = createMarketingHandler({
    store,
    config,
    sendEmail: async (_key, _from, _to, value) => {
      sent.push(value);
      return { id: "email_1" };
    },
  });
  await handler(subscribeRequest());
  const header = sent[0]?.headers?.["List-Unsubscribe"] ?? "";
  const unsubscribeUrl = header.replace(/^</, "").replace(/>$/, "");
  assert(unsubscribeUrl);

  const response = await handler(
    new Request(unsubscribeUrl, { method: "POST" }),
  );
  assertEquals(response.status, 200);
  assertEquals(response.headers.get("cache-control"), "no-store");
  assertEquals(store.record?.marketing_status, "unsubscribed");

  const tampered = await handler(
    new Request(`${unsubscribeUrl}x`, { method: "POST" }),
  );
  assertEquals(tampered.status, 400);
});

Deno.test("missing postal address saves consent but fails email delivery closed", async () => {
  const store = new MemoryStore();
  const handler = createMarketingHandler({
    store,
    config: { ...config, postalAddress: "" },
    sendEmail: async () => {
      throw new Error("sendEmail should not run");
    },
  });
  const response = await handler(subscribeRequest());
  assertEquals(response.status, 503);
  const body = await response.json();
  assertEquals(body.subscribed, true);
  assertEquals(body.emailSent, false);
  assertEquals(store.lastEmailError, "Missing MARKETING_POSTAL_ADDRESS");
});

Deno.test("subscribe rejects an unapproved browser origin", async () => {
  const store = new MemoryStore();
  const handler = createMarketingHandler({
    store,
    config,
    sendEmail: async () => ({ id: "unused" }),
  });
  const request = subscribeRequest();
  request.headers.set("origin", "https://attacker.example");
  const response = await handler(request);
  assertEquals(response.status, 403);
  assertEquals(store.record, null);
});
