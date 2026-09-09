import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/app/store";
import { useAuth } from "@/context/AuthContext";
import { notificationsApiSlice } from "@/features/notifications/notificationsApiSlice";
import type { NotificationItem } from "@/api/client";

export function useNotificationsSocket() {
  const { user } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (!user) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

    let pingInterval: number | null = null;

    function connect() {
      if (!isMountedRef.current || !user) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        // Keep-alive heartbeat
        pingInterval = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "PING" }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (
            payload.type === "NOTIFICATION_RECEIVED" &&
            payload.notification
          ) {
            const notification: NotificationItem = payload.notification;

            // 1. Update notification list cache in RTK Query
            dispatch(
              notificationsApiSlice.util.updateQueryData(
                "getNotifications",
                undefined,
                (draft) => {
                  if (!draft.some((item) => item.id === notification.id)) {
                    draft.unshift(notification);
                  }
                },
              ),
            );

            // 2. Update unread counter in RTK Query
            dispatch(
              notificationsApiSlice.util.updateQueryData(
                "getUnreadCount",
                undefined,
                (draft) => {
                  draft.unreadCount = (draft.unreadCount || 0) + 1;
                },
              ),
            );
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = (event) => {
        if (pingInterval) clearInterval(pingInterval);
        socketRef.current = null;

        // Auto reconnect after 3 seconds if not clean shutdown
        if (
          isMountedRef.current &&
          user &&
          event.code !== 1000 &&
          event.code !== 4001
        ) {
          reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      isMountedRef.current = false;
      if (pingInterval) clearInterval(pingInterval);
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close(1000);
        socketRef.current = null;
      }
    };
  }, [user, dispatch]);
}
