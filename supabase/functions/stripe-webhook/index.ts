import { stripeClient, Stripe } from "../_shared/stripe.ts";
import { serviceClient } from "../_shared/auth.ts";
import { planWebhookAction, type StripeEventLite } from "./webhook-logic.ts";

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!sig || !secret) return new Response("Missing signature", { status: 400 });
  const raw = await req.text();
  const stripe = stripeClient();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, secret, undefined, Stripe.createSubtleCryptoProvider());
  } catch (e) {
    return new Response(`Invalid signature: ${e instanceof Error ? e.message : e}`, { status: 400 });
  }
  const db = serviceClient();
  const { data: seen } = await db.from("payments").select("id").eq("stripe_event_id", event.id).maybeSingle();
  if (seen) return new Response(JSON.stringify({ idempotent: true }), { status: 200 });

  const action = planWebhookAction(event as unknown as StripeEventLite);
  try {
    if (action.kind === "payment_succeeded") {
      const { data: payment } = await db.from("payments")
        .select("id, booking_id, bookings(status)").eq("stripe_payment_intent_id", action.paymentIntentId).maybeSingle();
      if (!payment) return new Response(JSON.stringify({ skipped: "no_payment" }), { status: 200 });
      const pay = payment as Record<string, unknown>;
      const bookingStatus = (pay.bookings as { status?: string } | null)?.status;
      if (bookingStatus === "CANCELLED") {
        await db.from("payments").update({ stripe_event_id: action.eventId }).eq("id", pay.id);
        return new Response(JSON.stringify({ skipped: "booking_cancelled" }), { status: 200 });
      }
      await db.from("payments").update({ status: "SUCCEEDED", stripe_event_id: action.eventId }).eq("id", pay.id);
      if (action.bookingId) await db.from("bookings").update({ status: "CONFIRMED" }).eq("id", action.bookingId);
    } else if (action.kind === "payment_failed") {
      const { data: payment } = await db.from("payments").select("id").eq("stripe_payment_intent_id", action.paymentIntentId).maybeSingle();
      if (!payment) return new Response(JSON.stringify({ skipped: "no_payment" }), { status: 200 });
      await db.from("payments").update({ status: "FAILED", stripe_event_id: action.eventId }).eq("id", (payment as Record<string, unknown>).id);
    } else if (action.kind === "account_enabled") {
      await db.from("provider_profiles").update({ stripe_onboarding_complete: true }).eq("stripe_account_id", action.accountId);
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (e) {
    console.error("[stripe-webhook] handler error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500 });
  }
});
