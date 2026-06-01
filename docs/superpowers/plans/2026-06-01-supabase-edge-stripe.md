# Supabase Edge Functions: Stripe Connect (Plan 4b)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Stripe Connect (provider onboarding, payment intents, refunds, webhook) from the Express API into Supabase **Edge Functions**, faithfully replicating the existing `apps/api/src/services/payment.service.ts` behavior.

**Architecture:** Four Deno Edge Functions. Three are **user-authenticated** (`verify_jwt = true`): `stripe-connect` (provider onboarding link), `stripe-payment` (PaymentIntent for a booking), `stripe-refund` (provider/admin refund). One is **public + signature-verified** (`verify_jwt = false`): `stripe-webhook`. Each holds Stripe secrets server-side, uses the **service-role** key for privileged DB writes, and derives the caller from the request JWT. Pure logic (fee calc, refund authz/amount math, webhook event→DB-action routing) lives in testable modules with externals (Stripe + DB) mocked. Provider **earnings is NOT a function** — it's a client `supabase-js` query (the Plan-2 `payments` SELECT policy already authorizes a provider to read their own payments).

**Builds on:** Plans 1–4a. Branch off `main` (or continue on a Stripe branch). Repo root `/Users/guillermovillegas/development/Arc`. Deno 2.8.1 installed. Tables: `payments`, `refunds`, `provider_profiles.stripe_account_id/stripe_onboarding_complete`, `bookings.stripe_payment_intent_id`. Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PLATFORM_FEE_PERCENT` (default 5).

**Design calls (flagged):**
- Payment is a **separate step after booking** (client calls `stripe-payment(bookingId)` → `clientSecret` → confirms with Stripe.js), matching the Express flow. Booking is set `CONFIRMED` by the webhook on `payment_intent.succeeded` (not at intent creation).
- Stripe **idempotency keys** reused exactly: `booking_<id>` for intents, `refund_<bookingId>_<priorRefunded>_<amount>` for refunds.
- Deno tests **mock Stripe + DB**; real verification needs Stripe **test keys** + a Connect test account at deploy.
- Webhook signature verified with `stripe.webhooks.constructEventAsync` + `Stripe.createSubtleCryptoProvider()` (the Deno-correct async API).

---

## File Structure
- `supabase/functions/_shared/stripe.ts` — Stripe Deno client factory (fetch http client)
- `supabase/functions/_shared/auth.ts` — `getCaller(req)`: verify the request JWT → `{ userId, role }` (+ a service-role client factory)
- `supabase/functions/stripe-connect/index.ts` — provider onboarding
- `supabase/functions/stripe-payment/index.ts` — PaymentIntent; `payment-logic.ts` (fee calc) + tests
- `supabase/functions/stripe-refund/index.ts` — refund; `refund-logic.ts` (authz + amount math) + tests
- `supabase/functions/stripe-webhook/index.ts` — signature verify + dispatch; `webhook-logic.ts` (event→action) + tests
- `supabase/config.toml` — `verify_jwt` per function
- `supabase/functions/_shared/stripe.README.md` — secrets + webhook registration + deploy

---

## Task 0: Scaffold functions + shared helpers + config

- [ ] **Step 1: Scaffold the four functions**
```bash
supabase functions new stripe-connect
supabase functions new stripe-payment
supabase functions new stripe-refund
supabase functions new stripe-webhook
```

- [ ] **Step 2: `supabase/functions/_shared/stripe.ts`**
```ts
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

export function stripeClient(): Stripe {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  // Omit apiVersion to use the SDK's pinned default (avoids version-mismatch errors).
  return new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
}
export { Stripe };
```

- [ ] **Step 3: `supabase/functions/_shared/auth.ts`**
```ts
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface Caller { userId: string; role: string; }

// Verify the request's user JWT and return the caller. Throws on missing/invalid.
export async function getCaller(req: Request): Promise<Caller> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) throw new Response("Unauthorized", { status: 401 });
  const anon = createClient(
    Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user) throw new Response("Unauthorized", { status: 401 });
  // Role from profiles (service role read).
  const svc = serviceClient();
  const { data: profile } = await svc.from("profiles").select("role").eq("id", data.user.id).single();
  return { userId: data.user.id, role: (profile?.role as string) ?? "CLIENT" };
}

export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}
```

- [ ] **Step 4: `supabase/config.toml` — verify_jwt per function**
```toml
[functions.stripe-connect]
verify_jwt = true
[functions.stripe-payment]
verify_jwt = true
[functions.stripe-refund]
verify_jwt = true
[functions.stripe-webhook]
verify_jwt = false
```
(Match the format the CLI generated for `send-email`.)

- [ ] **Step 5: Commit**
```bash
git add supabase/functions/stripe-* supabase/functions/_shared/stripe.ts supabase/functions/_shared/auth.ts supabase/config.toml
git commit -m "chore(functions): scaffold Stripe edge functions + shared stripe/auth helpers"
```

---

## Task 1: Payment fee logic + tests

**Files:** `supabase/functions/stripe-payment/payment-logic.ts`, `payment-logic.test.ts`.

- [ ] **Step 1:** `payment-logic.ts`:
```ts
// Platform fee in cents, matching apps/api payment.service (round of total * pct/100).
export function platformFeeInCents(totalInCents: number, feePercent: number): number {
  return Math.round(totalInCents * (feePercent / 100));
}
export function providerPayoutInCents(totalInCents: number, feePercent: number): number {
  return totalInCents - platformFeeInCents(totalInCents, feePercent);
}
// Preconditions for creating an intent (pure; throws Error with a code-ish message).
export function assertPayable(booking: { clientId: string; status: string; stripeAccountId: string | null; chargesEnabled: boolean }, callerId: string): void {
  if (booking.clientId !== callerId) throw new Error("FORBIDDEN: Not your booking");
  if (booking.status === "CANCELLED") throw new Error("BOOKING_CANCELLED: Cannot pay for a cancelled booking");
  if (!booking.stripeAccountId) throw new Error("PAYMENT_FAILED: Provider has not set up payments");
  if (!booking.chargesEnabled) throw new Error("PAYMENT_FAILED: Provider's Stripe account is not ready to accept charges");
}
```

- [ ] **Step 2:** `payment-logic.test.ts`:
```ts
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
```

- [ ] **Step 3:** `deno test supabase/functions/stripe-payment/payment-logic.test.ts` → pass.
- [ ] **Step 4:** Commit `feat(functions): stripe payment fee + precondition logic + tests`.

---

## Task 2: stripe-payment function

**Files:** `supabase/functions/stripe-payment/index.ts`.

- [ ] **Step 1:** Write the handler (auth → load booking+provider via service role → assertPayable → retrieve account.charges_enabled → create intent with fee+destination+idempotencyKey `booking_<id>` → upsert payment(PENDING) + set booking.stripe_payment_intent_id → return clientSecret):
```ts
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
    const acctId = (booking as Record<string, any>).provider_profiles?.stripe_account_id ?? null;
    const stripe = stripeClient();
    let chargesEnabled = false;
    if (acctId) { const a = await stripe.accounts.retrieve(acctId); chargesEnabled = !!a.charges_enabled; }
    assertPayable({ clientId: (booking as any).client_id, status: (booking as any).status, stripeAccountId: acctId, chargesEnabled }, caller.userId);
    const feePct = Number(Deno.env.get("STRIPE_PLATFORM_FEE_PERCENT") ?? "5");
    const total = (booking as any).total_price_in_cents as number;
    const fee = platformFeeInCents(total, feePct);
    const pi = await stripe.paymentIntents.create({
      amount: total, currency: "usd", application_fee_amount: fee,
      transfer_data: { destination: acctId! },
      metadata: { bookingId, clientId: caller.userId, providerProfileId: (booking as any).provider_profile_id },
    }, { idempotencyKey: `booking_${bookingId}` });
    await db.from("payments").upsert({
      booking_id: bookingId, stripe_payment_intent_id: pi.id, amount_in_cents: total,
      platform_fee_in_cents: fee, provider_payout_in_cents: providerPayoutInCents(total, feePct), status: "PENDING",
    }, { onConflict: "booking_id" });
    await db.from("bookings").update({ stripe_payment_intent_id: pi.id }).eq("id", bookingId);
    return new Response(JSON.stringify({ clientSecret: pi.client_secret }), { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.startsWith("FORBIDDEN") ? 403 : msg.startsWith("BOOKING_CANCELLED") || msg.startsWith("PAYMENT_FAILED") ? 400 : 500;
    return new Response(JSON.stringify({ error: msg }), { status });
  }
});
```

- [ ] **Step 2:** `deno check supabase/functions/stripe-payment/index.ts` → clean (fetches esm.sh types).
- [ ] **Step 3:** Commit `feat(functions): stripe-payment edge function (payment intent + fee + destination)`.

---

## Task 3: Refund authz/amount logic + tests

**Files:** `supabase/functions/stripe-refund/refund-logic.ts`, `refund-logic.test.ts`.

- [ ] **Step 1:** `refund-logic.ts`:
```ts
export interface RefundCtx {
  callerRole: string; callerId: string; providerUserId: string;
  paymentStatus: string; amountInCents: number; refundedInCents: number; requested?: number;
}
// Returns the refund amount to charge, or throws Error("CODE: msg"). Mirrors payment.service.
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
```

- [ ] **Step 2:** `refund-logic.test.ts`:
```ts
import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { resolveRefundAmount } from "./refund-logic.ts";
const base = { callerRole: "ADMIN", callerId: "a1", providerUserId: "p1", paymentStatus: "SUCCEEDED", amountInCents: 5000, refundedInCents: 0 };
Deno.test("admin full refund defaults to remaining", () => assertEquals(resolveRefundAmount(base), 5000));
Deno.test("provider can refund own booking, partial", () =>
  assertEquals(resolveRefundAmount({ ...base, callerRole: "PROVIDER", callerId: "p1", requested: 2000 }), 2000));
Deno.test("provider cannot refund other's booking", () =>
  assertThrows(() => resolveRefundAmount({ ...base, callerRole: "PROVIDER", callerId: "x" }), Error, "Not your booking"));
Deno.test("client cannot refund", () =>
  assertThrows(() => resolveRefundAmount({ ...base, callerRole: "CLIENT" }), Error, "Insufficient permissions"));
Deno.test("over-remaining rejected", () =>
  assertThrows(() => resolveRefundAmount({ ...base, requested: 6000 }), Error, "exceeds remaining"));
Deno.test("non-succeeded rejected", () =>
  assertThrows(() => resolveRefundAmount({ ...base, paymentStatus: "PENDING" }), Error, "refundable state"));
```

- [ ] **Step 3:** `deno test supabase/functions/stripe-refund/refund-logic.test.ts` → 6 pass.
- [ ] **Step 4:** Commit `feat(functions): refund authz + amount logic + tests`.

---

## Task 4: stripe-refund function

**Files:** `supabase/functions/stripe-refund/index.ts`.

- [ ] **Step 1:** Handler: auth → load booking+payment+provider userId (service role) → `resolveRefundAmount` → `stripe.refunds.create` (idempotencyKey `refund_<bookingId>_<refunded>_<amount>`) → insert refund row + update payment refunded/status. Return {refundId, amountInCents, fullyRefunded}. (Mirror payment.service.refundPayment; use service-role writes.)
- [ ] **Step 2:** `deno check` clean.
- [ ] **Step 3:** Commit `feat(functions): stripe-refund edge function`.

---

## Task 5: stripe-connect function

**Files:** `supabase/functions/stripe-connect/index.ts`.

- [ ] **Step 1:** Handler: auth (must be the provider) → load provider_profiles by user_id → if `stripe_account_id` exists, create a fresh `account_onboarding` link; else create an Express account (`card_payments`+`transfers`), store `stripe_account_id` (service role), then create the link. refresh/return URLs → `${WEB_URL}/dashboard/provider/earnings?stripe=...`. Return `{ url }`. (WEB_URL from env, default the app URL.)
- [ ] **Step 2:** `deno check` clean.
- [ ] **Step 3:** Commit `feat(functions): stripe-connect onboarding edge function`.

---

## Task 6: Webhook event-routing logic + tests

**Files:** `supabase/functions/stripe-webhook/webhook-logic.ts`, `webhook-logic.test.ts`.

- [ ] **Step 1:** `webhook-logic.ts` — a pure planner that, given an event, returns the DB actions to perform (so it's testable without Stripe/DB):
```ts
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
```

- [ ] **Step 2:** `webhook-logic.test.ts`: assert each event type maps to the right Action (succeeded carries bookingId from metadata; account.updated with charges_enabled=false → ignore; unknown → ignore).
- [ ] **Step 3:** `deno test ...webhook-logic.test.ts` → pass.
- [ ] **Step 4:** Commit `feat(functions): stripe webhook event-routing logic + tests`.

---

## Task 7: stripe-webhook function

**Files:** `supabase/functions/stripe-webhook/index.ts`.

- [ ] **Step 1:** Handler:
  - Read the RAW body (`await req.text()`); get `stripe-signature` header.
  - Verify: `const event = await stripe.webhooks.constructEventAsync(rawBody, sig, Deno.env.get("STRIPE_WEBHOOK_SECRET")!, undefined, Stripe.createSubtleCryptoProvider());` — on failure return 400.
  - **Idempotency:** `select id from payments where stripe_event_id = event.id`; if found → 200 `{idempotent:true}`.
  - `planWebhookAction(event)` → execute via service role:
    - `payment_succeeded`: set payment SUCCEEDED + stripe_event_id (skip booking confirm if booking CANCELLED, but still stamp event id); if not cancelled and bookingId present → booking CONFIRMED.
    - `payment_failed`: payment FAILED + stripe_event_id.
    - `account_enabled`: `provider_profiles` set stripe_onboarding_complete=true where stripe_account_id = accountId.
  - Return 200 `{received:true}`.
- [ ] **Step 2:** `deno check` clean.
- [ ] **Step 3:** Commit `feat(functions): stripe-webhook (signature verify + event handling)`.

---

## Task 8: Docs + secrets

**Files:** `supabase/functions/_shared/stripe.README.md`.

- [ ] **Step 1:** Document required secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PLATFORM_FEE_PERCENT`, `SUPABASE_ANON_KEY`), how to register the webhook in the Stripe dashboard pointing at `…/functions/v1/stripe-webhook`, the four function URLs, that earnings is a client `supabase-js` query (not a function), and `supabase functions deploy stripe-connect stripe-payment stripe-refund stripe-webhook`.
- [ ] **Step 2:** Commit `docs(functions): stripe secrets + webhook registration`.

---

## Done criteria
- `deno test supabase/functions/` green (fee math, payment preconditions, refund authz/amount, webhook routing — all externals mocked).
- `deno check` clean on all four function entrypoints.
- `supabase db reset` + `supabase test db` unaffected (no DB schema changes in this plan).
- No secrets committed.

## Known gaps / deferred
- **Real Stripe verification is at deploy** (needs test keys + a Connect test account + the webhook registered in the Stripe dashboard with its signing secret). The Deno tests cover the pure logic; the thin Stripe API wrappers + signature verification are validated against Stripe in staging.
- Provider **earnings** = client `supabase-js` query against `payments` (RLS-authorized), implemented in the web/mobile rewrite plans.
- `stripe-payment` confirms the booking via the webhook (`payment_intent.succeeded`), matching the Express flow — the client must confirm the PaymentIntent with Stripe.js after receiving `clientSecret`.
- Google Calendar Edge Functions are Plan 4c.
