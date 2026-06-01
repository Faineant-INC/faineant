import { Request, Response, NextFunction } from "express";
import { countUploadsLast24h } from "../services/uploads.service";

export const DAILY_UPLOAD_QUOTA = 50;

export async function uploadQuota(
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

  try {
    const count = await countUploadsLast24h(req.user.userId);
    if (count >= DAILY_UPLOAD_QUOTA) {
      return res.status(429).json({
        success: false,
        error: {
          code: "UPLOAD_QUOTA_EXCEEDED",
          message: `Daily upload limit reached (${DAILY_UPLOAD_QUOTA}/day). Try again tomorrow.`,
        },
      });
    }
    next();
  } catch (err) {
    next(err);
  }
}
