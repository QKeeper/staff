import { Router } from "express";
import { PostController } from "./post.controller.js";
import {
  createPostSchema,
  listPostsQuerySchema,
  votePostSchema,
  createCommentSchema,
} from "./post.schemas.js";
import { validateRequest } from "../../common/middlewares/validateRequest.js";
import {
  optionalAuth,
  requireAuth,
} from "../../common/middlewares/requireAuth.js";

const router = Router();

router.post(
  "/",
  requireAuth,
  validateRequest({ body: createPostSchema }),
  PostController.create,
);

router.get(
  "/",
  optionalAuth,
  validateRequest({ query: listPostsQuerySchema }),
  PostController.list,
);

router.get("/:id", optionalAuth, PostController.getById);

router.post(
  "/:id/vote",
  requireAuth,
  validateRequest({ body: votePostSchema }),
  PostController.vote,
);

router.get("/:id/comments", optionalAuth, PostController.listComments);

router.post(
  "/:id/comments",
  requireAuth,
  validateRequest({ body: createCommentSchema }),
  PostController.createComment,
);

export { router as postRoutes };
