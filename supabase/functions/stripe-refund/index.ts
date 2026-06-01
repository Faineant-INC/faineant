import { stripeClient } from "../_shared/stripe.ts";
import { getCaller, serviceClient } from "../_shared/auth.ts";
import { resolveRefundAmount } from "./refund-logic.ts";

Deno.serve(async (req) => {
  let caller; try { caller = await getCaller(req); } catch (r) { return r as Response; }
  const body = await req.json().catch(() => ({}));
  const bookingId = body.bookingId as string | undefined;
  const requested = body.amountInCents as number | undefined;
  const reason = body.reason as string | undefined;
  if (!bookingId) return new Response(JSON.stringify({ error: "bookingId required" }), { status: 400 });
  const db = serviceClient();
  try {
    const { data: booking } = await db.from("bookings")
      .select("id, provider_profiles(user_id)").eq("id", bookingId).single();
    if (!booking) return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404 });
    const providerUserId = ((booking as Record<string, unknown>).provider_profiles as { user_id?: string } | null)?.user_id ?? "";
    const { data: payment } = await db.from("payments")
      .select("id, stripe_payment_intent_id, amount_in_cents, refunded_amount_in_cents, status")
      .eq("booking_id", bookingId).single();
    if (!payment) return new Response(JSON.stringify({ error: "NO_PAYMENT: No payment recorded for booking" }), { status: 400 });
    const p = payment as Record<string, unknown>;
    const amount = resolveRefundAmount({
      callerRole: caller.role, callerId: caller.userId, providerUserId,
      paymentStatus: p.status as string, amountInCents: p.amount_in_cents as number,
      refundedInCents: p.refunded_amount_in_cents as number, requested,
    });
    const stripe = stripeClient();
    const refund = await stripe.refunds.create({
      payment_intent: p.stripe_payment_intent_id as string,
      amount, reason: "requested_by_customer",
      metadata: { bookingId, initiatedByUserId: caller.userId },
    }, { idempotencyKey: `refund_${bookingId}_${p.refunded_amount_in_cents}_${amount}` });
    const newRefunded = (p.refunded_amount_in_cents as number) + amount;
    const fullyRefunded = newRefunded >= (p.amount_in_cents as number);
    await db.from("refunds").insert({
      payment_id: p.id, stripe_refund_id: refund.id, amount_in_cents: amount,
      reason: reason ?? null, initiated_by_user_id: caller.userId,
    });
    await db.from("payments").update({
      refunded_amount_in_cents: newRefunded, status: fullyRefunded ? "REFUNDED" : "SUCCEEDED",
    }).eq("id", p.id);
    return new Response(JSON.stringify({ refundId: refund.id, amountInCents: amount, fullyRefunded }), { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.startsWith("FORBIDDEN") ? 403
      : (msg.startsWith("INVALID_STATE") || msg.startsWith("ALREADY_REFUNDED") || msg.startsWith("INVALID_AMOUNT") || msg.startsWith("NO_PAYMENT")) ? 400 : 500;
    return new Response(JSON.stringify({ error: msg }), { status });
  }
});
