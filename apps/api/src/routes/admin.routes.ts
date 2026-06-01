import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { prisma } from "../config/database";

const router: Router = Router();

router.use(authenticate, requireRole("ADMIN"));

// Dashboard stats
router.get("/stats", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalUsers, totalProviders, totalBookings, totalRevenue] = await Promise.all([
      prisma.user.count(),
      prisma.providerProfile.count(),
      prisma.booking.count(),
      prisma.payment.aggregate({
        where: { status: "SUCCEEDED" },
        _sum: { platformFeeInCents: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalProviders,
        totalBookings,
        totalRevenue: totalRevenue._sum.platformFeeInCents || 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// List users with pagination
router.get("/users", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const role = req.query.role as string | undefined;

    const where = role ? { role: role as "CLIENT" | "PROVIDER" | "ADMIN" } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: { items: users, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    next(err);
  }
});

// Toggle user active status
router.patch("/users/:userId/toggle", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!user) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "User not found" } });

    const updated = await prisma.user.update({
      where: { id: req.params.userId },
      data: { isActive: !user.isActive },
    });

    res.json({ success: true, data: { id: updated.id, isActive: updated.isActive } });
  } catch (err) {
    next(err);
  }
});

// Verify provider
router.patch("/providers/:profileId/verify", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await prisma.providerProfile.update({
      where: { id: req.params.profileId },
      data: { isVerified: true },
    });
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

export default router;
