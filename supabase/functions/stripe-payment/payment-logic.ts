export function platformFeeInCents(totalInCents: number, feePercent: number): number {
  return Math.round(totalInCents * (feePercent / 100));
}
export function providerPayoutInCents(totalInCents: number, feePercent: number): number {
  return totalInCents - platformFeeInCents(totalInCents, feePercent);
}
export function assertPayable(booking: { clientId: string; status: string; stripeAccountId: string | null; chargesEnabled: boolean }, callerId: string): void {
  if (booking.clientId !== callerId) throw new Error("FORBIDDEN: Not your booking");
  if (booking.status === "CANCELLED") throw new Error("BOOKING_CANCELLED: Cannot pay for a cancelled booking");
  if (!booking.stripeAccountId) throw new Error("PAYMENT_FAILED: Provider has not set up payments");
  if (!booking.chargesEnabled) throw new Error("PAYMENT_FAILED: Provider's Stripe account is not ready to accept charges");
}
