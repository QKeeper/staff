import { apiSlice } from "../api/apiSlice";
import type { NotificationItem } from "@/api/client";

export const notificationsApiSlice = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<
      NotificationItem[],
      { page?: number; limit?: number } | void
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params) {
          if (params.page) searchParams.set("page", String(params.page));
          if (params.limit) searchParams.set("limit", String(params.limit));
        }
        const qs = searchParams.toString();
        return `/notifications${qs ? `?${qs}` : ""}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map((n) => ({
                type: "Notification" as const,
                id: n.id,
              })),
              { type: "Notification", id: "LIST" },
            ]
          : [{ type: "Notification", id: "LIST" }],
    }),

    getUnreadCount: build.query<{ unreadCount: number }, void>({
      query: () => "/notifications/unread-count",
      providesTags: [{ type: "Notification", id: "COUNT" }],
    }),

    markAsRead: build.mutation<
      { success: boolean; unreadCount: number },
      string
    >({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: "PATCH",
      }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        // Optimistic update
        const patchNotification = dispatch(
          notificationsApiSlice.util.updateQueryData(
            "getNotifications",
            undefined,
            (draft) => {
              const notif = draft.find((item) => item.id === id);
              if (notif && !notif.isRead) {
                notif.isRead = true;
              }
            },
          ),
        );

        const patchCount = dispatch(
          notificationsApiSlice.util.updateQueryData(
            "getUnreadCount",
            undefined,
            (draft) => {
              if (draft.unreadCount > 0) {
                draft.unreadCount -= 1;
              }
            },
          ),
        );

        try {
          await queryFulfilled;
        } catch {
          patchNotification.undo();
          patchCount.undo();
        }
      },
    }),

    markAllAsRead: build.mutation<
      { success: boolean; unreadCount: number },
      void
    >({
      query: () => ({
        url: "/notifications/mark-all-read",
        method: "POST",
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        // Optimistic update
        const patchNotifications = dispatch(
          notificationsApiSlice.util.updateQueryData(
            "getNotifications",
            undefined,
            (draft) => {
              for (const notif of draft) {
                notif.isRead = true;
              }
            },
          ),
        );

        const patchCount = dispatch(
          notificationsApiSlice.util.updateQueryData(
            "getUnreadCount",
            undefined,
            (draft) => {
              draft.unreadCount = 0;
            },
          ),
        );

        try {
          await queryFulfilled;
        } catch {
          patchNotifications.undo();
          patchCount.undo();
        }
      },
    }),

    markPostNotificationsAsRead: build.mutation<
      { success: boolean; unreadCount: number },
      string
    >({
      query: (postId) => ({
        url: `/notifications/posts/${postId}/read`,
        method: "PATCH",
      }),
      async onQueryStarted(postId, { dispatch, queryFulfilled }) {
        let unreadFound = 0;
        const patchNotifications = dispatch(
          notificationsApiSlice.util.updateQueryData(
            "getNotifications",
            undefined,
            (draft) => {
              for (const notif of draft) {
                if (notif.postId === postId && !notif.isRead) {
                  notif.isRead = true;
                  unreadFound++;
                }
              }
            },
          ),
        );

        const patchCount = dispatch(
          notificationsApiSlice.util.updateQueryData(
            "getUnreadCount",
            undefined,
            (draft) => {
              if (unreadFound > 0) {
                draft.unreadCount = Math.max(
                  0,
                  draft.unreadCount - unreadFound,
                );
              }
            },
          ),
        );

        try {
          const { data } = await queryFulfilled;
          dispatch(
            notificationsApiSlice.util.updateQueryData(
              "getUnreadCount",
              undefined,
              (draft) => {
                draft.unreadCount = data.unreadCount;
              },
            ),
          );
        } catch {
          patchNotifications.undo();
          patchCount.undo();
        }
      },
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useMarkPostNotificationsAsReadMutation,
} = notificationsApiSlice;
