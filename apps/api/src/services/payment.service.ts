import type Stripe from "stripe";
import { stripe } from "../config/stripe";
import { prisma } from "../config/database";
import { env } from "../config/env";
import { AppError } from "../middleware/error-handler";

export async function createStripeConnectAccount(userId: string, email: string) {
  const profile = await prisma.providerProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(404, "NOT_FOUND", "Provider profile not found");

  if (profile.stripeAccountId) {
    // Return existing account link for re-onboarding
    const accountLink = await stripe.accountLinks.create({
      account: profile.stripeAccountId,
      refresh_url: `${env.WEB_URL}/dashboard/provider/earnings?stripe=refresh`,
      return_url: `${env.WEB_URL}/dashboard/provider/earnings?stripe=complete`,
      type: "account_onboarding",
    });
    return { url: accountLink.url };
  }

  const account = await stripe.accounts.create({
    type: "express",
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  await prisma.providerProfile.update({
    where: { userId },
    data: { stripeAccountId: account.id },
  });

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${env.WEB_URL}/dashboard/provider/earnings?stripe=refresh`,
    return_url: `${env.WEB_URL}/dashboard/provider/earnings?stripe=complete`,
    type: "account_onboarding",
  });

  return { url: accountLink.url };
}

export async function createPaymentIntent(bookingId: string, clientId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { providerProfile: true, payment: true },
  });

  if (!booking) throw new AppError(404, "NOT_FOUND", "Booking not found");
  if (booking.clientId !== clientId) throw new AppError(403, "FORBIDDEN", "Not your booking");
  if (booking.status === "CANCELLED") {
    throw new AppError(400, "BOOKING_CANCELLED", "Cannot pay for a cancelled booking");
  }
  if (!booking.providerProfile.stripeAccountId) {
    throw new AppError(400, "PAYMENT_FAILED", "Provider has not set up payments");
  }

  // Verify Stripe Connect account is fully onboarded (charges enabled).
  const account = await stripe.accounts.retrieve(booking.providerProfile.stripeAccountId);
  if (!account.charges_enabled) {
    throw new AppError(
      400,
      "PAYMENT_FAILED",
      "Provider's Stripe account is not ready to accept charges",
    );
  }

  const platformFee = Math.round(
    booking.totalPriceInCents * (env.STRIPE_PLATFORM_FEE_PERCENT / 100),
  );

  // Idempotency key tied to bookingId — Stripe will return the prior intent if
  // we retry, instead of creating a duplicate PaymentIntent.
  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: booking.totalPriceInCents,
      currency: "usd",
      application_fee_amount: platformFee,
      transfer_data: {
        destination: booking.providerProfile.stripeAccountId,
      },
      metadata: {
        bookingId: booking.id,
        clientId,
        providerProfileId: booking.providerProfileId,
      },
    },
    { idempotencyKey: `booking_${booking.id}` },
  );

  // DB-level guard: bookingId is @unique on Payment, so a duplicate request
  // is upserted rather than throwing.
  await prisma.payment.upsert({
    where: { bookingId: booking.id },
    create: {
      bookingId: booking.id,
      stripePaymentIntentId: paymentIntent.id,
      amountInCents: booking.totalPriceInCents,
      platformFeeInCents: platformFee,
      providerPayoutInCents: booking.totalPriceInCents - platformFee,
      status: "PENDING",
    },
    update: {
      stripePaymentIntentId: paymentIntent.id,
    },
  });

  await prisma.booking.update({
    where: { id: bookingId },
    data: { stripePaymentIntentId: paymentIntent.id },
  });

  return { clientSecret: paymentIntent.client_secret };
}

interface WebhookEvent {
  id: string;
  type: string;
  data: { object: { id: string; metadata?: Record<string, string> } };
}

export async function handleStripeWebhook(event: WebhookEvent) {
  // Idempotency: if we've processed this event before, no-op. We mark the
  // event id on the affected Payment row in the same write that mutates it.
  const existing = await prisma.payment.findFirst({
    where: { stripeEventId: event.id },
    select: { id: true },
  });
  if (existing) return { idempotent: true };

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object;
      const payment = await prisma.payment.findUnique({
        where: { stripePaymentIntentId: pi.id },
        include: { booking: { select: { status: true } } },
      });
      if (!payment) return { skipped: "no_payment" };

      // Guard: do not re-confirm a booking that has been cancelled.
      if (payment.booking.status === "CANCELLED") {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { stripeEventId: event.id },
        });
        return { skipped: "booking_cancelled" };
      }

      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "SUCCEEDED", stripeEventId: event.id },
      });
      if (pi.metadata?.bookingId) {
        await prisma.booking.update({
          where: { id: pi.metadata.bookingId },
          data: { status: "CONFIRMED" },
        });
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object;
      const payment = await prisma.payment.findUnique({
        where: { stripePaymentIntentId: pi.id },
        select: { id: true },
      });
      if (!payment) return { skipped: "no_payment" };
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", stripeEventId: event.id },
      });
      break;
    }
    case "account.updated": {
      const account = event.data.object as unknown as { id: string; charges_enabled: boolean };
      if (account.charges_enabled) {
        await prisma.providerProfile.updateMany({
          where: { stripeAccountId: account.id },
          data: { stripeOnboardingComplete: true },
        });
      }
      break;
    }
  }
  return { processed: true };
}

export interface RefundParams {
  bookingId: string;
  userId: string;
  userRole: "CLIENT" | "PROVIDER" | "ADMIN";
  amountInCents?: number;
  reason?: string;
}

export async function refundPayment(params: RefundParams) {
  const { bookingId, userId, userRole, amountInCents, reason } = params;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      payment: true,
      providerProfile: { select: { userId: true } },
    },
  });
  if (!booking) throw new AppError(404, "NOT_FOUND", "Booking not found");
  if (!booking.payment) throw new AppError(400, "NO_PAYMENT", "No payment recorded for booking");
  if (booking.payment.status !== "SUCCEEDED") {
    throw new AppError(400, "INVALID_STATE", "Payment is not in a refundable state");
  }

  // Authorisation: ADMIN can refund anyone; PROVIDER can refund their own bookings.
  if (userRole === "PROVIDER") {
    if (booking.providerProfile.userId !== userId) {
      throw new AppError(403, "FORBIDDEN", "Not your booking");
    }
  } else if (userRole !== "ADMIN") {
    throw new AppError(403, "FORBIDDEN", "Insufficient permissions to refund");
  }

  const remaining = booking.payment.amountInCents - booking.payment.refundedAmountInCents;
  if (remaining <= 0) {
    throw new AppError(400, "ALREADY_REFUNDED", "Payment is already fully refunded");
  }

  // Providers can issue partial refunds; admins can issue full refunds.
  // If no amount supplied, default to remaining (full refund of the balance).
  const refundAmount = amountInCents ?? remaining;
  if (refundAmount <= 0) {
    throw new AppError(400, "INVALID_AMOUNT", "Refund amount must be positive");
  }
  if (refundAmount > remaining) {
    throw new AppError(400, "INVALID_AMOUNT", "Refund amount exceeds remaining balance");
  }
  if (userRole === "PROVIDER" && refundAmount === booking.payment.amountInCents && remaining === booking.payment.amountInCents) {
    // Providers may issue full refunds too — this branch is intentionally permissive.
  }

  const refund = await stripe.refunds.create(
    {
      payment_intent: booking.payment.stripePaymentIntentId,
      amount: refundAmount,
      reason: "requested_by_customer",
      metadata: {
        bookingId,
        initiatedByUserId: userId,
      },
    },
    { idempotencyKey: `refund_${bookingId}_${booking.payment.refundedAmountInCents}_${refundAmount}` },
  );

  const newRefundedTotal = booking.payment.refundedAmountInCents + refundAmount;
  const fullyRefunded = newRefundedTotal >= booking.payment.amountInCents;

  await prisma.$transaction([
    prisma.refund.create({
      data: {
        paymentId: booking.payment.id,
        stripeRefundId: refund.id,
        amountInCents: refundAmount,
        reason: reason ?? null,
        initiatedByUserId: userId,
      },
    }),
    prisma.payment.update({
      where: { id: booking.payment.id },
      data: {
        refundedAmountInCents: newRefundedTotal,
        status: fullyRefunded ? "REFUNDED" : "SUCCEEDED",
      },
    }),
  ]);

  return {
    refundId: refund.id,
    amountInCents: refundAmount,
    totalRefundedInCents: newRefundedTotal,
    fullyRefunded,
  };
}

export interface EarningsQuery {
  cursor?: string;
  limit: number;
}

export async function getProviderEarnings(userId: string, query: EarningsQuery) {
  const profile = await prisma.providerProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(404, "NOT_FOUND", "Provider profile not found");

  const limit = Math.min(Math.max(query.limit, 1), 100);

  const payments = await prisma.payment.findMany({
    where: {
      booking: { providerProfileId: profile.id },
      status: "SUCCEEDED",
    },
    include: {
      booking: {
        select: { startTime: true, service: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });

  const hasMore = payments.length > limit;
  const items = hasMore ? payments.slice(0, limit) : payments;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  // Aggregate lifetime earnings independently of the page being viewed.
  const aggregate = await prisma.payment.aggregate({
    where: {
      booking: { providerProfileId: profile.id },
      status: "SUCCEEDED",
    },
    _sum: { providerPayoutInCents: true },
  });

  return {
    totalEarnings: aggregate._sum.providerPayoutInCents ?? 0,
    payments: items,
    nextCursor,
    hasMore,
  };
}

// Re-export for tests that wish to assert on the Stripe namespace type.
export type { Stripe };
