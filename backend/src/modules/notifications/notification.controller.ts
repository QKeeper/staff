import { Request, Response } from "express";
import { NotificationService } from "./notification.service.js";
import { sendSuccess } from "../../common/responses/apiResponse.js";
import { BadRequestError } from "../../common/errors/appError.js";

export class NotificationController {
  static async list(req: Request, res: Response): Promise<void> {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : 20;

    const result = await NotificationService.getNotifications(req.user!.id, {
      page,
      limit,
    });
    sendSuccess(res, result.items, {
      ...result.meta,
      unreadCount: result.unreadCount,
    });
  }

  static async getUnreadCount(req: Request, res: Response): Promise<void> {
    const result = await NotificationService.getUnreadCount(req.user!.id);
    sendSuccess(res, result);
  }

  static async markAsRead(req: Request, res: Response): Promise<void> {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      throw new BadRequestError("Notification ID is required");
    }

    const result = await NotificationService.markAsRead(req.user!.id, id);
    sendSuccess(res, result);
  }

  static async markAllAsRead(req: Request, res: Response): Promise<void> {
    const result = await NotificationService.markAllAsRead(req.user!.id);
    sendSuccess(res, result);
  }

  static async markPostAsRead(req: Request, res: Response): Promise<void> {
    const rawPostId = req.params.postId;
    const postId = Array.isArray(rawPostId) ? rawPostId[0] : rawPostId;
    if (!postId) {
      throw new BadRequestError("Post ID is required");
    }

    const result = await NotificationService.markPostNotificationsAsRead(
      req.user!.id,
      postId,
    );
    sendSuccess(res, result);
  }
}
