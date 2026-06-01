import { stripeClient } from "../_shared/stripe.ts";
import { getCaller, serviceClient } from "../_shared/auth.ts";
import { platformFeeInCents, providerPayoutInCents, assertPayable } from "./payment-logic.ts";

Deno.serve(async (req) => {
  let caller; try { caller = await getCaller(req); } catch (r) { return r as Response; }
  const { bookingId } = await req.json().catch(() => ({}));
  if (!bookingId) return new Response(JSON.stringify({ error: "bookingId required" }), { status: 400 });
  const db = serviceClient();
  try {
    const { data: booking } = await db.from("bookings")
      .select("id, client_id, status, total_price_in_cents, provider_profile_id, provider_profiles(stripe_account_id)")
      .eq("id", bookingId).single();
    if (!booking) return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404 });
    const b = booking as Record<string, unknown>;
    const acctId = (b.provider_profiles as { stripe_account_id?: string } | null)?.stripe_account_id ?? null;
    const stripe = stripeClient();
    let chargesEnabled = false;
    if (acctId) { const a = await stripe.accounts.retrieve(acctId); chargesEnabled = !!a.charges_enabled; }
    assertPayable({ clientId: b.client_id as string, status: b.status as string, stripeAccountId: acctId, chargesEnabled }, caller.userId);
    const feePct = Number(Deno.env.get("STRIPE_PLATFORM_FEE_PERCENT") ?? "5");
    const total = b.total_price_in_cents as number;
    const fee = platformFeeInCents(total, feePct);
    const pi = await stripe.paymentIntents.create({
      amount: total, currency: "usd", application_fee_amount: fee,
      transfer_data: { destination: acctId! },
      metadata: { bookingId, clientId: caller.userId, providerProfileId: b.provider_profile_id as string },
    }, { idempotencyKey: `booking_${bookingId}` });
    await db.from("payments").upsert({
      booking_id: bookingId, stripe_payment_intent_id: pi.id, amount_in_cents: total,
      platform_fee_in_cents: fee, provider_payout_in_cents: providerPayoutInCents(total, feePct), status: "PENDING",
    }, { onConflict: "booking_id" });
    await db.from("bookings").update({ stripe_payment_intent_id: pi.id }).eq("id", bookingId);
    return new Response(JSON.stringify({ clientSecret: pi.client_secret }), { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.startsWith("FORBIDDEN") ? 403 : (msg.startsWith("BOOKING_CANCELLED") || msg.startsWith("PAYMENT_FAILED")) ? 400 : 500;
    return new Response(JSON.stringify({ error: msg }), { status });
  }
});
