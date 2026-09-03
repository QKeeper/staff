import { Router } from "express";
import { CommunityController } from "./community.controller.js";
import {
  createCommunitySchema,
  getCommunityParamsSchema,
  listCommunitiesQuerySchema,
} from "./community.schemas.js";
import { validateRequest } from "../../common/middlewares/validateRequest.js";
import {
  optionalAuth,
  requireAuth,
} from "../../common/middlewares/requireAuth.js";

const router = Router();

// 1. Create a community (Requires authenticated user)
router.post(
  "/",
  requireAuth,
  validateRequest({ body: createCommunitySchema }),
  CommunityController.create,
);

// 2. Communities of current user (for sidebar)
router.get("/my", requireAuth, CommunityController.getMyCommunities);

// 3. List all communities (public, with pagination, topic filter & search)
router.get(
  "/",
  validateRequest({ query: listCommunitiesQuerySchema }),
  CommunityController.list,
);

// 4. Get specific community by name/slug (public, optionalAuth to check membership)
router.get(
  "/:name",
  optionalAuth,
  validateRequest({ params: getCommunityParamsSchema }),
  CommunityController.getByName,
);

export { router as communityRoutes };
