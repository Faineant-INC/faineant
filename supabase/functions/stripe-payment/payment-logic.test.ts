import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { platformFeeInCents, providerPayoutInCents, assertPayable } from "./payment-logic.ts";

Deno.test("fee math: 5% of 5000 = 250, payout 4750", () => {
  assertEquals(platformFeeInCents(5000, 5), 250);
  assertEquals(providerPayoutInCents(5000, 5), 4750);
});
Deno.test("fee rounds", () => { assertEquals(platformFeeInCents(1999, 5), 100); });
Deno.test("assertPayable blocks non-owner / cancelled / no-account / charges-disabled", () => {
  const ok = { clientId: "c1", status: "PENDING", stripeAccountId: "acct_1", chargesEnabled: true };
  assertThrows(() => assertPayable(ok, "c2"), Error, "Not your booking");
  assertThrows(() => assertPayable({ ...ok, status: "CANCELLED" }, "c1"), Error, "cancelled");
  assertThrows(() => assertPayable({ ...ok, stripeAccountId: null }, "c1"), Error, "set up payments");
  assertThrows(() => assertPayable({ ...ok, chargesEnabled: false }, "c1"), Error, "ready to accept");
});
