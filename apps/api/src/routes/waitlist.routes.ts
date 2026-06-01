import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { waitlistSchema } from "@faineant/shared";
import { validate } from "../middleware/validate";
import { prisma } from "../config/database";

const waitlistLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "RATE_LIMITED", message: "Too many submissions, please try again later" },
  },
});

const router: Router = Router();

router.post(
  "/",
  waitlistLimiter,
  validate(waitlistSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, source, referrer, website } = req.body;

      // Honeypot tripped: respond as success without persisting (don't tip off bots).
      if (website && website.length > 0) {
        return res.status(201).json({ success: true });
      }

      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "";
      const ipHash = ip
        ? crypto.createHash("sha256").update(ip).digest("hex").slice(0, 32)
        : null;
      const userAgent = req.headers["user-agent"]?.slice(0, 512) ?? null;

      // Idempotent: never reveal whether the email already exists.
      await prisma.waitlistEntry.upsert({
        where: { email },
        update: {},
        create: {
          email,
          source: source ?? null,
          referrer: referrer ?? null,
          userAgent,
          ipHash,
        },
      });

      res.status(201).json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
