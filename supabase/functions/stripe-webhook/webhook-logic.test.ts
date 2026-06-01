import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { planWebhookAction } from "./webhook-logic.ts";

Deno.test("payment_intent.succeeded -> payment_succeeded with bookingId", () => {
  const a = planWebhookAction({ id: "evt_1", type: "payment_intent.succeeded", data: { object: { id: "pi_1", metadata: { bookingId: "bk_1" } } } });
  assertEquals(a, { kind: "payment_succeeded", paymentIntentId: "pi_1", eventId: "evt_1", bookingId: "bk_1" });
});
Deno.test("payment_intent.payment_failed -> payment_failed", () => {
  const a = planWebhookAction({ id: "evt_2", type: "payment_intent.payment_failed", data: { object: { id: "pi_2" } } });
  assertEquals(a, { kind: "payment_failed", paymentIntentId: "pi_2", eventId: "evt_2" });
});
Deno.test("account.updated charges_enabled -> account_enabled", () => {
  const a = planWebhookAction({ id: "evt_3", type: "account.updated", data: { object: { id: "acct_1", charges_enabled: true } } });
  assertEquals(a, { kind: "account_enabled", accountId: "acct_1" });
});
Deno.test("account.updated not enabled -> ignore", () => {
  const a = planWebhookAction({ id: "evt_4", type: "account.updated", data: { object: { id: "acct_1", charges_enabled: false } } });
  assertEquals(a, { kind: "ignore" });
});
Deno.test("unknown event -> ignore", () => {
  const a = planWebhookAction({ id: "evt_5", type: "charge.captured", data: { object: { id: "ch_1" } } });
  assertEquals(a, { kind: "ignore" });
});
