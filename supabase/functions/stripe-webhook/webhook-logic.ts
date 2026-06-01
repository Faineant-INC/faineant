export interface StripeEventLite {
  id: string; type: string;
  data: { object: { id: string; metadata?: Record<string, string>; charges_enabled?: boolean } };
}
export type Action =
  | { kind: "payment_succeeded"; paymentIntentId: string; eventId: string; bookingId?: string }
  | { kind: "payment_failed"; paymentIntentId: string; eventId: string }
  | { kind: "account_enabled"; accountId: string }
  | { kind: "ignore" };

export function planWebhookAction(e: StripeEventLite): Action {
  switch (e.type) {
    case "payment_intent.succeeded":
      return { kind: "payment_succeeded", paymentIntentId: e.data.object.id, eventId: e.id, bookingId: e.data.object.metadata?.bookingId };
    case "payment_intent.payment_failed":
      return { kind: "payment_failed", paymentIntentId: e.data.object.id, eventId: e.id };
    case "account.updated":
      return e.data.object.charges_enabled ? { kind: "account_enabled", accountId: e.data.object.id } : { kind: "ignore" };
    default:
      return { kind: "ignore" };
  }
}
