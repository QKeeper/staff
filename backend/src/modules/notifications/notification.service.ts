import { prisma, NotificationType } from "../../db/prisma.js";
import { sendToUser } from "../../websocket/wsServer.js";

export class NotificationService {
  static async createPostNotifications(data: {
    postId: string;
    authorId: string;
    communityId?: string | null;
    title: string;
  }) {
    try {
      // 1. Find all followers of the post author
      const userFollowers = await prisma.userFollow.findMany({
        where: { followingId: data.authorId },
        select: { followerId: true },
      });

      // 2. If the post is in a community, find all followers of that community
      let communityFollowers: { userId: string }[] = [];
      if (data.communityId) {
        communityFollowers = await prisma.communityFollow.findMany({
          where: { communityId: data.communityId },
          select: { userId: true },
        });
      }

      // 3. Deduplicate recipients:
      // Even if user follows both author and community, they appear only once in this Set
      const recipientIds = new Set<string>();
      for (const f of userFollowers) {
        recipientIds.add(f.followerId);
      }
      for (const cf of communityFollowers) {
        recipientIds.add(cf.userId);
      }

      // Author should never receive a notification about their own post
      recipientIds.delete(data.authorId);

      if (recipientIds.size === 0) {
        return;
      }

      // 4. Batch create notifications in DB
      const records = Array.from(recipientIds).map((userId) => ({
        userId,
        actorId: data.authorId,
        postId: data.postId,
        communityId: data.communityId || null,
        type: NotificationType.NEW_POST,
      }));

      await prisma.notification.createMany({ data: records });

      // 5. Query the created notifications with populated relations to push via WebSocket
      const createdNotifications = await prisma.notification.findMany({
        where: {
          postId: data.postId,
          actorId: data.authorId,
        },
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          community: {
            select: {
              id: true,
              name: true,
              displayName: true,
            },
          },
          post: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      for (const notif of createdNotifications) {
        sendToUser(notif.userId, {
          type: "NOTIFICATION_RECEIVED",
          notification: notif,
        });
      }
    } catch (err) {
      console.error("Failed to create and dispatch post notifications:", err);
    }
  }

  static async getNotifications(
    userId: string,
    query: { page?: number; limit?: number },
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(50, query.limit || 20));
    const skip = (page - 1) * limit;

    const [total, unreadCount, items] = await Promise.all([
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          community: {
            select: {
              id: true,
              name: true,
              displayName: true,
            },
          },
          post: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      unreadCount,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getUnreadCount(userId: string) {
    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { unreadCount };
  }

  static async markAsRead(userId: string, notificationId: string) {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { success: true, unreadCount };
  }

  static async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { success: true, unreadCount: 0 };
  }

  static async markPostNotificationsAsRead(userId: string, postId: string) {
    await prisma.notification.updateMany({
      where: { userId, postId, isRead: false },
      data: { isRead: true },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { success: true, unreadCount };
  }
}
