import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from "./auth.schemas.js";
import { validateRequest } from "../../common/middlewares/validateRequest.js";
import {
  requireAuth,
  optionalAuth,
} from "../../common/middlewares/requireAuth.js";

const router = Router();

router.post(
  "/register",
  validateRequest({ body: registerSchema }),
  AuthController.register,
);
router.post(
  "/login",
  validateRequest({ body: loginSchema }),
  AuthController.login,
);
router.post(
  "/refresh",
  validateRequest({ body: refreshTokenSchema }),
  AuthController.refresh,
);
router.post("/logout", AuthController.logout);
router.get("/me", requireAuth, AuthController.me);
router.patch("/me/avatar", requireAuth, AuthController.updateAvatar);
router.patch("/me/banner", requireAuth, AuthController.updateBanner);
router.get("/users/:username", optionalAuth, AuthController.getUserProfile);
router.post("/users/:username/follow", requireAuth, AuthController.followUser);
router.delete(
  "/users/:username/follow",
  requireAuth,
  AuthController.unfollowUser,
);

export { router as authRoutes };
