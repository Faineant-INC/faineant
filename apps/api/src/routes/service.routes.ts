import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { validate } from "../middleware/validate";
import { createServiceSchema, updateServiceSchema } from "@faineant/shared";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error-handler";

const router: Router = Router();

// Create service (provider only)
router.post(
  "/",
  authenticate,
  requireRole("PROVIDER"),
  validate(createServiceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await prisma.providerProfile.findUnique({
        where: { userId: req.user!.userId },
      });
      if (!profile) throw new AppError(404, "NOT_FOUND", "Provider profile not found");

      const service = await prisma.service.create({
        data: { providerProfileId: profile.id, ...req.body },
      });
      res.status(201).json({ success: true, data: service });
    } catch (err) {
      next(err);
    }
  },
);

// Get provider's services
router.get(
  "/mine",
  authenticate,
  requireRole("PROVIDER"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await prisma.providerProfile.findUnique({
        where: { userId: req.user!.userId },
      });
      const services = await prisma.service.findMany({
        where: { providerProfileId: profile!.id },
        orderBy: { createdAt: "desc" },
      });
      res.json({ success: true, data: services });
    } catch (err) {
      next(err);
    }
  },
);

// Update service
router.put(
  "/:serviceId",
  authenticate,
  requireRole("PROVIDER"),
  validate(updateServiceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await prisma.providerProfile.findUnique({
        where: { userId: req.user!.userId },
      });
      const service = await prisma.service.findFirst({
        where: { id: req.params.serviceId, providerProfileId: profile!.id },
      });
      if (!service) throw new AppError(404, "NOT_FOUND", "Service not found");

      const updated = await prisma.service.update({
        where: { id: req.params.serviceId },
        data: req.body,
      });
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },
);

// Delete service (soft - set inactive)
router.delete(
  "/:serviceId",
  authenticate,
  requireRole("PROVIDER"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await prisma.providerProfile.findUnique({
        where: { userId: req.user!.userId },
      });
      await prisma.service.updateMany({
        where: { id: req.params.serviceId, providerProfileId: profile!.id },
        data: { isActive: false },
      });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
