import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { validate } from "../middleware/validate";
import { setAvailabilitySchema, createOverrideSchema } from "@faineant/shared";
import * as availabilityService from "../services/availability.service";

const router: Router = Router();

// Set weekly availability (replaces existing)
router.put(
  "/",
  authenticate,
  requireRole("PROVIDER"),
  validate(setAvailabilitySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await availabilityService.setAvailability(req.user!.userId, req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// Get provider's availability
router.get(
  "/:providerProfileId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slots = await availabilityService.getAvailability(req.params.providerProfileId);
      res.json({ success: true, data: slots });
    } catch (err) {
      next(err);
    }
  },
);

// Get available time slots for a specific date and service
router.get(
  "/:providerProfileId/slots",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { date, serviceDuration } = req.query;
      if (!date || !serviceDuration) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "date and serviceDuration are required" },
        });
      }
      const slots = await availabilityService.getAvailableSlots(
        req.params.providerProfileId,
        date as string,
        parseInt(serviceDuration as string),
      );
      res.json({ success: true, data: slots });
    } catch (err) {
      next(err);
    }
  },
);

// Create/update availability override (block day, special hours)
router.post(
  "/overrides",
  authenticate,
  requireRole("PROVIDER"),
  validate(createOverrideSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const override = await availabilityService.createOverride(req.user!.userId, req.body);
      res.status(201).json({ success: true, data: override });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
