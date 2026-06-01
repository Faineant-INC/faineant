export interface RefundCtx {
  callerRole: string; callerId: string; providerUserId: string;
  paymentStatus: string; amountInCents: number; refundedInCents: number; requested?: number;
}
export function resolveRefundAmount(c: RefundCtx): number {
  if (c.paymentStatus !== "SUCCEEDED") throw new Error("INVALID_STATE: Payment is not in a refundable state");
  if (c.callerRole === "PROVIDER") {
    if (c.providerUserId !== c.callerId) throw new Error("FORBIDDEN: Not your booking");
  } else if (c.callerRole !== "ADMIN") {
    throw new Error("FORBIDDEN: Insufficient permissions to refund");
  }
  const remaining = c.amountInCents - c.refundedInCents;
  if (remaining <= 0) throw new Error("ALREADY_REFUNDED: Payment is already fully refunded");
  const amount = c.requested ?? remaining;
  if (amount <= 0) throw new Error("INVALID_AMOUNT: Refund amount must be positive");
  if (amount > remaining) throw new Error("INVALID_AMOUNT: Refund amount exceeds remaining balance");
  return amount;
}
