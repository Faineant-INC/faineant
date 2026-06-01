import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/role";
import { validate } from "../middleware/validate";
import { addIcsFeedSchema } from "@faineant/shared";
import * as calendarService from "../services/calendar-sync.service";

const router: Router = Router();

// ─── Get all calendar connections ─────────────────────────────────────────

router.get(
  "/connections",
  authenticate,
  requireRole("PROVIDER"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const connections = await calendarService.getConnections(req.user!.userId);
      res.json({ success: true, data: connections });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Google Calendar OAuth ────────────────────────────────────────────────

router.get(
  "/google/connect",
  authenticate,
  requireRole("PROVIDER"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const url = calendarService.getGoogleAuthUrl(req.user!.userId);
      res.json({ success: true, data: { url } });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/google/callback",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, state: userId } = req.query;
      if (!code || !userId) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Missing code or state" },
        });
      }

      await calendarService.handleGoogleCallback(
        code as string,
        userId as string,
      );

      // Redirect back to dashboard settings
      const webUrl = process.env.WEB_URL || "http://localhost:3000";
      res.redirect(`${webUrl}/dashboard/provider/settings?calendar=connected`);
    } catch (err) {
      next(err);
    }
  },
);

// ─── ICS Feed ─────────────────────────────────────────────────────────────

router.post(
  "/ics",
  authenticate,
  requireRole("PROVIDER"),
  validate(addIcsFeedSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await calendarService.addIcsFeed(
        req.user!.userId,
        req.body.feedUrl,
      );
      res.status(201).json({
        success: true,
        data: {
          connection: result.connection,
          eventsImported: result.eventCount,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Sync ─────────────────────────────────────────────────────────────────

router.post(
  "/sync/:connectionId",
  authenticate,
  requireRole("PROVIDER"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { connectionId } = req.params;

      // Verify the connection belongs to this user
      const connections = await calendarService.getConnections(req.user!.userId);
      const connection = connections.find((c) => c.id === connectionId);
      if (!connection) {
        return res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Calendar connection not found" },
        });
      }

      if (connection.provider === "GOOGLE") {
        await calendarService.syncGoogleCalendar(connectionId);
      } else if (connection.provider === "ICS_FEED") {
        await calendarService.syncIcsFeed(connectionId);
      }

      res.json({ success: true, data: { message: "Sync complete" } });
    } catch (err) {
      next(err);
    }
  },
);

// ─── Disconnect ───────────────────────────────────────────────────────────

router.delete(
  "/connections/:connectionId",
  authenticate,
  requireRole("PROVIDER"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await calendarService.disconnectCalendar(
        req.user!.userId,
        req.params.connectionId,
      );
      res.json({ success: true, data: { message: "Calendar disconnected" } });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
