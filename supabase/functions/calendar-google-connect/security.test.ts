import {
  assert,
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { decrypt, encrypt } from "../_shared/crypto.ts";
import { normalizeIcsUrl, readResponseText } from "../_shared/ics.ts";
import { signState, verifyState } from "../_shared/oauth-state.ts";

const tokenKey = btoa(String.fromCharCode(...new Uint8Array(32)));
Deno.env.set("CALENDAR_TOKEN_KEY", tokenKey);
Deno.env.set(
  "STATE_SIGNING_SECRET",
  "test-secret-that-is-at-least-32-characters-long",
);

Deno.test("calendar token encryption round-trips without plaintext storage", async () => {
  const encrypted = await encrypt("ya29.secret-token");
  assert(encrypted !== "ya29.secret-token");
  assertEquals(await decrypt(encrypted), "ya29.secret-token");
});

Deno.test("OAuth state verifies, expires, and rejects tampering", async () => {
  const state = await signState("user-1", 60, 1_000);
  assertEquals(await verifyState(state, 1_030), "user-1");
  assertEquals(await verifyState(state, 1_061), null);
  const [payload, encodedSignature] = state.split(".");
  const tamperedSignature = `${encodedSignature[0] === "A" ? "B" : "A"}${encodedSignature.slice(1)}`;
  assertEquals(
    await verifyState(`${payload}.${tamperedSignature}`, 1_030),
    null,
  );
});

Deno.test("ICS URLs require a public HTTPS destination", async () => {
  assertEquals(
    normalizeIcsUrl("webcal://calendar.example.com/feed.ics").toString(),
    "https://calendar.example.com/feed.ics",
  );
  await assertRejects(
    async () => normalizeIcsUrl("http://calendar.example.com/feed.ics"),
    Error,
    "HTTPS",
  );
  await assertRejects(
    async () => normalizeIcsUrl("https://127.0.0.1/feed.ics"),
    Error,
    "Private",
  );
  await assertRejects(
    async () => normalizeIcsUrl("https://169.254.169.254/latest/meta-data"),
    Error,
    "Private",
  );
});

Deno.test("ICS response bodies are limited while streaming", async () => {
  const encoder = new TextEncoder();
  const response = new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("123"));
        controller.enqueue(encoder.encode("45"));
        controller.close();
      },
    }),
  );
  await assertRejects(
    async () => await readResponseText(response, 4),
    Error,
    "too large",
  );
});
