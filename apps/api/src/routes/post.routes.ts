import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createPostSchema, createCommentSchema, PostCategory } from "@faineant/shared";
import * as postService from "../services/post.service";

const router: Router = Router();

// Get posts
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await postService.getPosts(
      req.query.category as PostCategory | undefined,
      req.query.page ? parseInt(req.query.page as string) : undefined,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Get single post with comments
router.get("/:postId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await postService.getPostById(req.params.postId);
    res.json({ success: true, data: post });
  } catch (err) {
    next(err);
  }
});

// Create post
router.post(
  "/",
  authenticate,
  validate(createPostSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const post = await postService.createPost(req.user!.userId, req.body);
      res.status(201).json({ success: true, data: post });
    } catch (err) {
      next(err);
    }
  },
);

// Add comment
router.post(
  "/:postId/comments",
  authenticate,
  validate(createCommentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const comment = await postService.createComment(
        req.user!.userId,
        req.params.postId,
        req.body,
      );
      res.status(201).json({ success: true, data: comment });
    } catch (err) {
      next(err);
    }
  },
);

// Delete post
router.delete(
  "/:postId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await postService.deletePost(req.params.postId, req.user!.userId, req.user!.role === "ADMIN");
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
