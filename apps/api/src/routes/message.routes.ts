import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { sendMessageSchema } from "@faineant/shared";
import * as messageService from "../services/message.service";

const router: Router = Router();

// Get all conversations
router.get(
  "/conversations",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conversations = await messageService.getConversations(req.user!.userId);
      res.json({ success: true, data: conversations });
    } catch (err) {
      next(err);
    }
  },
);

// Get messages in a conversation
router.get(
  "/conversations/:conversationId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const messages = await messageService.getMessages(
        req.user!.userId,
        req.params.conversationId,
        req.query.limit ? parseInt(req.query.limit as string) : undefined,
        req.query.before as string | undefined,
      );
      res.json({ success: true, data: messages });
    } catch (err) {
      next(err);
    }
  },
);

// Send a message
router.post(
  "/send",
  authenticate,
  validate(sendMessageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let conversationId = req.body.conversationId;

      if (!conversationId && req.body.recipientId) {
        const conv = await messageService.getOrCreateConversation(
          req.user!.userId,
          req.body.recipientId,
        );
        conversationId = conv.id;
      }

      if (!conversationId) {
        return res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "conversationId or recipientId required" },
        });
      }

      const message = await messageService.sendMessage(
        req.user!.userId,
        conversationId,
        req.body.text,
        req.body.imageUrl,
      );
      res.status(201).json({ success: true, data: message });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
