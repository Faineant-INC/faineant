import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";

/**
 * Gate that ensures the authenticated user has confirmed their email address.
 * Apply AFTER `authenticate`. Used for booking + payment routes per
 * BUILD-PLAN §1.1.
 */
export async function requireVerifiedEmail(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { emailVerified: true },
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Account not found" },
    });
  }

  if (!user.emailVerified) {
    return res.status(403).json({
      success: false,
      error: {
        code: "EMAIL_NOT_VERIFIED",
        message: "Confirm your email before continuing",
      },
    });
  }

  next();
}
