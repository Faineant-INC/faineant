import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { resolveRefundAmount } from "./refund-logic.ts";
const base = { callerRole: "ADMIN", callerId: "a1", providerUserId: "p1", paymentStatus: "SUCCEEDED", amountInCents: 5000, refundedInCents: 0 };
Deno.test("admin full refund defaults to remaining", () => assertEquals(resolveRefundAmount(base), 5000));
Deno.test("provider can refund own booking, partial", () =>
  assertEquals(resolveRefundAmount({ ...base, callerRole: "PROVIDER", callerId: "p1", requested: 2000 }), 2000));
Deno.test("provider cannot refund other's booking", () => {
  assertThrows(() => resolveRefundAmount({ ...base, callerRole: "PROVIDER", callerId: "x" }), Error, "Not your booking");
});
Deno.test("client cannot refund", () => {
  assertThrows(() => resolveRefundAmount({ ...base, callerRole: "CLIENT" }), Error, "Insufficient permissions");
});
Deno.test("over-remaining rejected", () => {
  assertThrows(() => resolveRefundAmount({ ...base, requested: 6000 }), Error, "exceeds remaining");
});
Deno.test("non-succeeded rejected", () => {
  assertThrows(() => resolveRefundAmount({ ...base, paymentStatus: "PENDING" }), Error, "refundable state");
});
