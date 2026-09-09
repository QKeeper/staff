import { Router } from "express";
import { NotificationController } from "./notification.controller.js";
import { requireAuth } from "../../common/middlewares/requireAuth.js";

const router = Router();

// All notification endpoints require authenticated user
router.use(requireAuth);

router.get("/", NotificationController.list);
router.get("/unread-count", NotificationController.getUnreadCount);
router.patch("/:id/read", NotificationController.markAsRead);
router.patch("/posts/:postId/read", NotificationController.markPostAsRead);
router.post("/mark-all-read", NotificationController.markAllAsRead);

export { router as notificationRoutes };
