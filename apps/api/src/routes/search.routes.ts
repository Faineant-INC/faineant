import { Router, Request, Response, NextFunction } from "express";
import * as searchService from "../services/search.service";
import { ServiceCategory } from "@faineant/shared";

const router: Router = Router();

// Search providers
router.get(
  "/providers",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await searchService.searchProviders({
        latitude: req.query.lat ? parseFloat(req.query.lat as string) : undefined,
        longitude: req.query.lng ? parseFloat(req.query.lng as string) : undefined,
        radiusMiles: req.query.radius ? parseFloat(req.query.radius as string) : undefined,
        category: req.query.category as ServiceCategory | undefined,
        query: req.query.q as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// Get provider by slug (public profile page)
router.get(
  "/providers/:slug",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = await searchService.getProviderBySlug(req.params.slug);
      if (!provider) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Provider not found" },
        });
      }
      res.json({ success: true, data: provider });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
