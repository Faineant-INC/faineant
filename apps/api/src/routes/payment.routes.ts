import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { requireVerifiedEmail } from "../middleware/require-verified-email";
import { validate } from "../middleware/validate";
import { refundRequestSchema, earningsQuerySchema } from "@faineant/shared";
import * as paymentService from "../services/payment.service";
import { stripe } from "../config/stripe";
import { env } from "../config/env";

const router = Router();

// Create Stripe Connect account for provider
router.post(
  "/connect",
  authenticate,
  requireRole("PROVIDER"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await paymentService.createStripeConnectAccount(
        req.user!.userId,
        req.body.email,
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// Create payment intent for a booking — requires verified email
router.post(
  "/intent/:bookingId",
  authenticate,
  requireVerifiedEmail,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await paymentService.createPaymentIntent(
        req.params.bookingId,
        req.user!.userId,
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// Refund a booking's payment.
// PROVIDER can refund their own bookings (partial or full); ADMIN can refund any.
router.post(
  "/:bookingId/refund",
  authenticate,
  requireRole("PROVIDER", "ADMIN"),
  validate(refundRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await paymentService.refundPayment({
        bookingId: req.params.bookingId,
        userId: req.user!.userId,
        userRole: req.user!.role as "PROVIDER" | "ADMIN",
        amountInCents: req.body.amountInCents,
        reason: req.body.reason,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// Stripe webhook handler
router.post(
  "/webhook",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sig = req.headers["stripe-signature"] as string;
      const event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
      await paymentService.handleStripeWebhook(
        event as unknown as Parameters<typeof paymentService.handleStripeWebhook>[0],
      );
      res.json({ received: true });
    } catch (err) {
      next(err);
    }
  },
);

// Get provider earnings (cursor-paginated)
router.get(
  "/earnings",
  authenticate,
  requireRole("PROVIDER"),
  validate(earningsQuerySchema, "query"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cursor, limit } = req.query as unknown as { cursor?: string; limit: number };
      const earnings = await paymentService.getProviderEarnings(req.user!.userId, {
        cursor,
        limit,
      });
      res.json({ success: true, data: earnings });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
