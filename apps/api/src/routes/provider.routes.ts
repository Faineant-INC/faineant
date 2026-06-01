import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { validate } from "../middleware/validate";
import { updateProviderProfileSchema, createPortfolioItemSchema } from "@faineant/shared";
import * as userService from "../services/user.service";
import { prisma } from "../config/database";

const router: Router = Router();

// Get own provider profile
router.get(
  "/me",
  authenticate,
  requireRole("PROVIDER"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userService.getUserById(req.user!.userId);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },
);

// Update provider profile
router.put(
  "/me",
  authenticate,
  requireRole("PROVIDER"),
  validate(updateProviderProfileSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await userService.updateProviderProfile(req.user!.userId, req.body);
      res.json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  },
);

// Portfolio CRUD
router.get(
  "/me/portfolio",
  authenticate,
  requireRole("PROVIDER"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await prisma.providerProfile.findUnique({
        where: { userId: req.user!.userId },
      });
      const items = await prisma.portfolioItem.findMany({
        where: { providerProfileId: profile!.id },
        orderBy: { sortOrder: "asc" },
      });
      res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/me/portfolio",
  authenticate,
  requireRole("PROVIDER"),
  validate(createPortfolioItemSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await prisma.providerProfile.findUnique({
        where: { userId: req.user!.userId },
      });
      const item = await prisma.portfolioItem.create({
        data: { providerProfileId: profile!.id, ...req.body },
      });
      res.status(201).json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/me/portfolio/:itemId",
  authenticate,
  requireRole("PROVIDER"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await prisma.providerProfile.findUnique({
        where: { userId: req.user!.userId },
      });
      await prisma.portfolioItem.deleteMany({
        where: { id: req.params.itemId, providerProfileId: profile!.id },
      });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
