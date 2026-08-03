import {
  assertEquals,
  assertObjectMatch,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { sendEmail } from "../_shared/resend.ts";

Deno.test("Resend transport forwards idempotency and one-click headers", async () => {
  const originalFetch = globalThis.fetch;
  let requestHeaders = new Headers();
  let requestBody: Record<string, unknown> = {};
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init as globalThis.RequestInit);
    requestHeaders = new Headers(request.headers);
    requestBody = (await request.json()) as Record<string, unknown>;
    return new Response(JSON.stringify({ id: "email_1" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const result = await sendEmail(
      "re_test",
      "Faineant <noreply@faineantapp.com>",
      "person@example.com",
      {
        subject: "You're on the list",
        html: "<p>Welcome</p>",
        text: "Welcome",
        headers: {
          "List-Unsubscribe": "<https://example.com/unsubscribe>",
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      },
      "marketing-welcome/contact-1",
    );
    assertEquals(result.id, "email_1");
    assertEquals(
      requestHeaders.get("Idempotency-Key"),
      "marketing-welcome/contact-1",
    );
    assertObjectMatch(requestBody, {
      to: "person@example.com",
      headers: {
        "List-Unsubscribe": "<https://example.com/unsubscribe>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
