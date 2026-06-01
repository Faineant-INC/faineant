import { Router, Request, Response, NextFunction } from "express";
import { uploadSignSchema, uploadFinalizeSchema } from "@faineant/shared";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { uploadQuota } from "../middleware/upload-quota";
import {
  createPresignedUpload,
  finalizeUpload,
} from "../services/uploads.service";

const router = Router();

// POST /uploads/sign  — request a presigned PUT URL
router.post(
  "/sign",
  authenticate,
  uploadQuota,
  validate(uploadSignSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await createPresignedUpload(req.user!.userId, req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// POST /uploads/finalize  — confirm upload completed; record in DB
router.post(
  "/finalize",
  authenticate,
  validate(uploadFinalizeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await finalizeUpload(req.user!.userId, req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
