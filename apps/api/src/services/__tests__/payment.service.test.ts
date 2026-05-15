import { describe, it, expect, vi, beforeEach } from "vitest";

// ── env stub ───────────────────────────────────────────────────────────────
vi.mock("../../config/env", () => ({
  env: {
    WEB_URL: "https://example.com",
    STRIPE_PLATFORM_FEE_PERCENT: 5,
    STRIPE_SECRET_KEY: "sk_test_xxx",
    STRIPE_WEBHOOK_SECRET: "whsec_xxx",
  },
}));

// ── In-memory data store used to back the Prisma mock ───────────────────────
interface FakePayment {
  id: string;
  bookingId: string;
  stripePaymentIntentId: string;
  stripeEventId: string | null;
  amountInCents: number;
  platformFeeInCents: number;
  providerPayoutInCents: number;
  refundedAmountInCents: number;
  status: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
  createdAt: Date;
}
interface FakeBooking {
  id: string;
  clientId: string;
  providerProfileId: string;
  totalPriceInCents: number;
  status: "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
}
interface FakeProviderProfile {
  id: string;
  userId: string;
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;
}

const db = {
  payments: new Map<string, FakePayment>(),
  bookings: new Map<string, FakeBooking>(),
  profiles: new Map<string, FakeProviderProfile>(),
  refunds: [] as Array<{ id: string; paymentId: string; stripeRefundId: string; amountInCents: number }>,
};

function resetDb() {
  db.payments.clear();
  db.bookings.clear();
  db.profiles.clear();
  db.refunds.length = 0;
}

// ── Prisma mock ────────────────────────────────────────────────────────────
vi.mock("../../config/database", () => ({
  prisma: {
    booking: {
      findUnique: vi.fn(async (args: { where: { id: string }; include?: Record<string, unknown> }) => {
        const b = db.bookings.get(args.where.id);
        if (!b) return null;
        const profile = [...db.profiles.values()].find((p) => p.id === b.providerProfileId);
        const payment = [...db.payments.values()].find((p) => p.bookingId === b.id);
        return {
          ...b,
          providerProfile: profile ?? null,
          payment: payment ?? null,
        };
      }),
      update: vi.fn(async (args: { where: { id: string }; data: Partial<FakeBooking> }) => {
        const b = db.bookings.get(args.where.id);
        if (!b) throw new Error("booking not found");
        Object.assign(b, args.data);
        return b;
      }),
    },
    payment: {
      findFirst: vi.fn(async (args: { where: { stripeEventId?: string } }) => {
        if (!args.where.stripeEventId) return null;
        return (
          [...db.payments.values()].find((p) => p.stripeEventId === args.where.stripeEventId) ??
          null
        );
      }),
      findUnique: vi.fn(
        async (args: {
          where: { stripePaymentIntentId?: string; id?: string };
          include?: Record<string, unknown>;
          select?: Record<string, unknown>;
        }) => {
          let payment: FakePayment | undefined;
          if (args.where.stripePaymentIntentId) {
            payment = [...db.payments.values()].find(
              (p) => p.stripePaymentIntentId === args.where.stripePaymentIntentId,
            );
          } else if (args.where.id) {
            payment = db.payments.get(args.where.id);
          }
          if (!payment) return null;
          if (args.include?.booking) {
            const booking = db.bookings.get(payment.bookingId)!;
            return { ...payment, booking };
          }
          return payment;
        },
      ),
      create: vi.fn(async (args: { data: Omit<FakePayment, "id" | "createdAt" | "refundedAmountInCents" | "stripeEventId"> & Partial<FakePayment> }) => {
        const id = `pay_${Math.random().toString(36).slice(2)}`;
        const row: FakePayment = {
          id,
          bookingId: args.data.bookingId,
          stripePaymentIntentId: args.data.stripePaymentIntentId,
          stripeEventId: args.data.stripeEventId ?? null,
          amountInCents: args.data.amountInCents,
          platformFeeInCents: args.data.platformFeeInCents,
          providerPayoutInCents: args.data.providerPayoutInCents,
          refundedAmountInCents: args.data.refundedAmountInCents ?? 0,
          status: args.data.status ?? "PENDING",
          createdAt: new Date(),
        };
        db.payments.set(id, row);
        return row;
      }),
      upsert: vi.fn(
        async (args: {
          where: { bookingId: string };
          create: Partial<FakePayment> & { bookingId: string; stripePaymentIntentId: string };
          update: Partial<FakePayment>;
        }) => {
          const existing = [...db.payments.values()].find((p) => p.bookingId === args.where.bookingId);
          if (existing) {
            Object.assign(existing, args.update);
            return existing;
          }
          const id = `pay_${Math.random().toString(36).slice(2)}`;
          const row: FakePayment = {
            id,
            bookingId: args.create.bookingId,
            stripePaymentIntentId: args.create.stripePaymentIntentId,
            stripeEventId: null,
            amountInCents: args.create.amountInCents ?? 0,
            platformFeeInCents: args.create.platformFeeInCents ?? 0,
            providerPayoutInCents: args.create.providerPayoutInCents ?? 0,
            refundedAmountInCents: 0,
            status: args.create.status ?? "PENDING",
            createdAt: new Date(),
          };
          db.payments.set(id, row);
          return row;
        },
      ),
      update: vi.fn(async (args: { where: { id: string }; data: Partial<FakePayment> }) => {
        const p = db.payments.get(args.where.id);
        if (!p) throw new Error("payment not found");
        Object.assign(p, args.data);
        return p;
      }),
      findMany: vi.fn(
        async (args: {
          where: { booking: { providerProfileId: string }; status: string };
          orderBy?: unknown;
          take?: number;
          cursor?: { id: string };
          skip?: number;
          include?: Record<string, unknown>;
        }) => {
          let rows = [...db.payments.values()]
            .filter((p) => {
              const b = db.bookings.get(p.bookingId);
              return (
                b &&
                b.providerProfileId === args.where.booking.providerProfileId &&
                p.status === args.where.status
              );
            })
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

          if (args.cursor) {
            const idx = rows.findIndex((r) => r.id === args.cursor!.id);
            if (idx >= 0) rows = rows.slice(idx + (args.skip ?? 0));
          }
          if (args.take) rows = rows.slice(0, args.take);
          return rows.map((r) => ({
            ...r,
            booking: { startTime: new Date(), service: { name: "test" } },
          }));
        },
      ),
      aggregate: vi.fn(async () => ({ _sum: { providerPayoutInCents: 0 } })),
    },
    providerProfile: {
      findUnique: vi.fn(async (args: { where: { userId: string } }) => {
        return [...db.profiles.values()].find((p) => p.userId === args.where.userId) ?? null;
      }),
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    refund: {
      create: vi.fn(async (args: { data: { paymentId: string; stripeRefundId: string; amountInCents: number } }) => {
        const r = { id: `rf_${Math.random().toString(36).slice(2)}`, ...args.data };
        db.refunds.push(r);
        return r;
      }),
    },
    $transaction: vi.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops)),
  },
}));

// ── Stripe mock (hoisted so it is initialized before vi.mock factory runs) ──
const { stripeMock } = vi.hoisted(() => ({
  stripeMock: {
    paymentIntents: { create: vi.fn() },
    refunds: { create: vi.fn() },
    accounts: { retrieve: vi.fn(), create: vi.fn() },
    accountLinks: { create: vi.fn() },
    webhooks: { constructEvent: vi.fn() },
  },
}));

vi.mock("../../config/stripe", () => ({
  stripe: stripeMock,
}));

// ── Module under test ──────────────────────────────────────────────────────
import * as paymentService from "../payment.service";
import { AppError } from "../../middleware/error-handler";

function seedProvider(opts: { userId?: string; stripeAccount?: string | null } = {}) {
  const id = `prof_${Math.random().toString(36).slice(2)}`;
  const profile: FakeProviderProfile = {
    id,
    userId: opts.userId ?? "user_provider_1",
    stripeAccountId: opts.stripeAccount === undefined ? "acct_123" : opts.stripeAccount,
    stripeOnboardingComplete: true,
  };
  db.profiles.set(id, profile);
  return profile;
}

function seedBooking(
  providerProfileId: string,
  opts: { clientId?: string; status?: FakeBooking["status"]; price?: number } = {},
) {
  const id = `bk_${Math.random().toString(36).slice(2)}`;
  const b: FakeBooking = {
    id,
    clientId: opts.clientId ?? "user_client_1",
    providerProfileId,
    totalPriceInCents: opts.price ?? 10_000,
    status: opts.status ?? "PENDING",
  };
  db.bookings.set(id, b);
  return b;
}

function seedPayment(
  bookingId: string,
  opts: { status?: FakePayment["status"]; amount?: number; refunded?: number } = {},
) {
  const id = `pay_${Math.random().toString(36).slice(2)}`;
  const amount = opts.amount ?? 10_000;
  const p: FakePayment = {
    id,
    bookingId,
    stripePaymentIntentId: `pi_${id}`,
    stripeEventId: null,
    amountInCents: amount,
    platformFeeInCents: Math.round(amount * 0.05),
    providerPayoutInCents: amount - Math.round(amount * 0.05),
    refundedAmountInCents: opts.refunded ?? 0,
    status: opts.status ?? "SUCCEEDED",
    createdAt: new Date(),
  };
  db.payments.set(id, p);
  return p;
}

beforeEach(() => {
  resetDb();
  vi.clearAllMocks();
  stripeMock.accounts.retrieve.mockResolvedValue({ charges_enabled: true });
});

describe("payment.service", () => {
  describe("createPaymentIntent", () => {
    it("passes idempotency key tied to bookingId", async () => {
      const profile = seedProvider();
      const booking = seedBooking(profile.id, { clientId: "client_1" });
      stripeMock.paymentIntents.create.mockResolvedValue({
        id: "pi_abc",
        client_secret: "secret_abc",
      });

      await paymentService.createPaymentIntent(booking.id, "client_1");

      expect(stripeMock.paymentIntents.create).toHaveBeenCalledTimes(1);
      const args = stripeMock.paymentIntents.create.mock.calls[0];
      expect(args[1]).toEqual({ idempotencyKey: `booking_${booking.id}` });
    });

    it("rejects when provider's Stripe account does not have charges enabled", async () => {
      const profile = seedProvider();
      const booking = seedBooking(profile.id, { clientId: "client_1" });
      stripeMock.accounts.retrieve.mockResolvedValue({ charges_enabled: false });

      await expect(
        paymentService.createPaymentIntent(booking.id, "client_1"),
      ).rejects.toBeInstanceOf(AppError);
      expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
    });

    it("refuses to create intent for a cancelled booking", async () => {
      const profile = seedProvider();
      const booking = seedBooking(profile.id, { clientId: "client_1", status: "CANCELLED" });

      await expect(
        paymentService.createPaymentIntent(booking.id, "client_1"),
      ).rejects.toBeInstanceOf(AppError);
    });
  });

  describe("handleStripeWebhook", () => {
    it("is idempotent — same event id processed twice mutates state once", async () => {
      const profile = seedProvider();
      const booking = seedBooking(profile.id);
      const payment = seedPayment(booking.id, { status: "PENDING" });

      const event = {
        id: "evt_1",
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: payment.stripePaymentIntentId,
            metadata: { bookingId: booking.id },
          },
        },
      };

      const r1 = await paymentService.handleStripeWebhook(event);
      const r2 = await paymentService.handleStripeWebhook(event);

      expect(r1).toMatchObject({ processed: true });
      expect(r2).toMatchObject({ idempotent: true });

      const after = db.payments.get(payment.id)!;
      expect(after.status).toBe("SUCCEEDED");
      expect(after.stripeEventId).toBe("evt_1");
      expect(db.bookings.get(booking.id)!.status).toBe("CONFIRMED");
    });

    it("ignores succeeded events for cancelled bookings (does not re-confirm)", async () => {
      const profile = seedProvider();
      const booking = seedBooking(profile.id, { status: "CANCELLED" });
      const payment = seedPayment(booking.id, { status: "PENDING" });

      const result = await paymentService.handleStripeWebhook({
        id: "evt_cancel",
        type: "payment_intent.succeeded",
        data: {
          object: { id: payment.stripePaymentIntentId, metadata: { bookingId: booking.id } },
        },
      });

      expect(result).toMatchObject({ skipped: "booking_cancelled" });
      expect(db.bookings.get(booking.id)!.status).toBe("CANCELLED");
      expect(db.payments.get(payment.id)!.status).toBe("PENDING");
    });
  });

  describe("refundPayment", () => {
    it("happy path: admin issues full refund", async () => {
      const profile = seedProvider({ userId: "provider_owner" });
      const booking = seedBooking(profile.id);
      const payment = seedPayment(booking.id, { status: "SUCCEEDED", amount: 10_000 });
      stripeMock.refunds.create.mockResolvedValue({ id: "re_1" });

      const result = await paymentService.refundPayment({
        bookingId: booking.id,
        userId: "admin_1",
        userRole: "ADMIN",
      });

      expect(stripeMock.refunds.create).toHaveBeenCalled();
      expect(result.fullyRefunded).toBe(true);
      expect(result.amountInCents).toBe(10_000);
      expect(db.payments.get(payment.id)!.status).toBe("REFUNDED");
      expect(db.payments.get(payment.id)!.refundedAmountInCents).toBe(10_000);
      expect(db.refunds).toHaveLength(1);
    });

    it("provider can issue a partial refund on their own booking", async () => {
      const profile = seedProvider({ userId: "provider_owner" });
      const booking = seedBooking(profile.id);
      const payment = seedPayment(booking.id, { status: "SUCCEEDED", amount: 10_000 });
      stripeMock.refunds.create.mockResolvedValue({ id: "re_partial" });

      const result = await paymentService.refundPayment({
        bookingId: booking.id,
        userId: "provider_owner",
        userRole: "PROVIDER",
        amountInCents: 3_000,
      });

      expect(result.fullyRefunded).toBe(false);
      expect(result.amountInCents).toBe(3_000);
      expect(db.payments.get(payment.id)!.status).toBe("SUCCEEDED");
      expect(db.payments.get(payment.id)!.refundedAmountInCents).toBe(3_000);
    });

    it("rejects when a different provider tries to refund someone else's booking", async () => {
      const profile = seedProvider({ userId: "provider_owner" });
      const booking = seedBooking(profile.id);
      seedPayment(booking.id, { status: "SUCCEEDED" });

      await expect(
        paymentService.refundPayment({
          bookingId: booking.id,
          userId: "other_provider",
          userRole: "PROVIDER",
        }),
      ).rejects.toBeInstanceOf(AppError);
      expect(stripeMock.refunds.create).not.toHaveBeenCalled();
    });

    it("rejects refund amounts exceeding the remaining balance", async () => {
      const profile = seedProvider({ userId: "provider_owner" });
      const booking = seedBooking(profile.id);
      seedPayment(booking.id, { status: "SUCCEEDED", amount: 10_000, refunded: 7_000 });

      await expect(
        paymentService.refundPayment({
          bookingId: booking.id,
          userId: "admin_1",
          userRole: "ADMIN",
          amountInCents: 5_000,
        }),
      ).rejects.toBeInstanceOf(AppError);
    });

    it("rejects when payment is not in a refundable state", async () => {
      const profile = seedProvider({ userId: "provider_owner" });
      const booking = seedBooking(profile.id);
      seedPayment(booking.id, { status: "PENDING" });

      await expect(
        paymentService.refundPayment({
          bookingId: booking.id,
          userId: "admin_1",
          userRole: "ADMIN",
        }),
      ).rejects.toBeInstanceOf(AppError);
    });
  });

  describe("getProviderEarnings", () => {
    it("returns the requested page and a nextCursor when more rows remain", async () => {
      const profile = seedProvider({ userId: "p1" });
      // Seed 3 succeeded payments, separated by createdAt
      const now = Date.now();
      for (let i = 0; i < 3; i++) {
        const b = seedBooking(profile.id);
        const p = seedPayment(b.id, { status: "SUCCEEDED" });
        // overwrite createdAt to ensure ordering
        db.payments.get(p.id)!.createdAt = new Date(now - i * 1000);
      }

      const page1 = await paymentService.getProviderEarnings("p1", { limit: 2 });
      expect(page1.payments).toHaveLength(2);
      expect(page1.hasMore).toBe(true);
      expect(page1.nextCursor).not.toBeNull();

      const page2 = await paymentService.getProviderEarnings("p1", {
        limit: 2,
        cursor: page1.nextCursor!,
      });
      expect(page2.payments).toHaveLength(1);
      expect(page2.hasMore).toBe(false);
      expect(page2.nextCursor).toBeNull();
    });
  });
});
