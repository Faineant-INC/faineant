import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth";
import { requireVerifiedEmail } from "../middleware/require-verified-email";
import { validate } from "../middleware/validate";
import { createBookingSchema, updateBookingStatusSchema } from "@faineant/shared";
import * as bookingService from "../services/booking.service";

const router = Router();

// Create booking (client) — requires verified email
router.post(
  "/",
  authenticate,
  requireVerifiedEmail,
  validate(createBookingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const booking = await bookingService.createBooking(req.user!.userId, req.body);
      res.status(201).json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  },
);

// Update booking status
router.patch(
  "/:bookingId/status",
  authenticate,
  validate(updateBookingStatusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const booking = await bookingService.updateBookingStatus(
        req.params.bookingId,
        req.user!.userId,
        req.body.status,
      );
      res.json({ success: true, data: booking });
    } catch (err) {
      next(err);
    }
  },
);

// Get client's bookings
router.get(
  "/client",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bookings = await bookingService.getClientBookings(
        req.user!.userId,
        req.query.status as string | undefined,
      );
      res.json({ success: true, data: bookings });
    } catch (err) {
      next(err);
    }
  },
);

// Get provider's bookings
router.get(
  "/provider",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bookings = await bookingService.getProviderBookings(
        req.user!.userId,
        req.query.status as string | undefined,
      );
      res.json({ success: true, data: bookings });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
