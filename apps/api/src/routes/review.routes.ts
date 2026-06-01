import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth";
import * as reviewService from "../services/review.service";

const router: Router = Router();

// Create review
router.post(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bookingId, rating, text, photos } = req.body;
      const review = await reviewService.createReview(
        req.user!.userId,
        bookingId,
        rating,
        text,
        photos,
      );
      res.status(201).json({ success: true, data: review });
    } catch (err) {
      next(err);
    }
  },
);

// Get reviews for a provider
router.get(
  "/provider/:providerProfileId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await reviewService.getProviderReviews(
        req.params.providerProfileId,
        req.query.page ? parseInt(req.query.page as string) : undefined,
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
