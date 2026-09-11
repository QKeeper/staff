import { WebSocketServer, WebSocket } from "ws";
import type { Server, IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthenticatedUser } from "../common/middlewares/requireAuth.js";

interface CustomWebSocket extends WebSocket {
  isAlive?: boolean;
  userId?: string;
}

const userSockets = new Map<string, Set<CustomWebSocket>>();
let wss: WebSocketServer | null = null;

function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name) {
      cookies[name] = decodeURIComponent(rest.join("="));
    }
  }
  return cookies;
}

function extractTokenFromRequest(req: IncomingMessage): string | null {
  const url = new URL(
    req.url || "",
    `http://${req.headers.host || "localhost"}`,
  );
  const queryToken = url.searchParams.get("token");
  if (queryToken) return queryToken;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  const cookies = parseCookies(req.headers.cookie);
  if (cookies.access_token) {
    return cookies.access_token;
  }

  return null;
}

export function initWebSocketServer(server: Server): WebSocketServer {
  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket, head) => {
    const url = new URL(
      req.url || "",
      `http://${req.headers.host || "localhost"}`,
    );
    if (url.pathname === "/api/ws" || url.pathname === "/ws") {
      wss!.handleUpgrade(req, socket, head, (ws) => {
        wss!.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws: CustomWebSocket, req: IncomingMessage) => {
    const token = extractTokenFromRequest(req);

    if (!token) {
      ws.close(4001, "Unauthorized");
      return;
    }

    try {
      const payload = jwt.verify(
        token,
        env.JWT_ACCESS_SECRET,
      ) as AuthenticatedUser;

      ws.userId = payload.id;
      ws.isAlive = true;

      if (!userSockets.has(payload.id)) {
        userSockets.set(payload.id, new Set());
      }
      userSockets.get(payload.id)!.add(ws);

      ws.on("pong", () => {
        ws.isAlive = true;
      });

      ws.on("message", (raw) => {
        try {
          const message = JSON.parse(raw.toString());
          if (message.type === "PING") {
            ws.send(JSON.stringify({ type: "PONG" }));
          }
        } catch {
          // Ignore non-json messages
        }
      });

      ws.on("close", () => {
        if (ws.userId && userSockets.has(ws.userId)) {
          const set = userSockets.get(ws.userId)!;
          set.delete(ws);
          if (set.size === 0) {
            userSockets.delete(ws.userId);
          }
        }
      });
    } catch {
      ws.close(4001, "Invalid token");
    }
  });

  const heartbeatInterval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((client) => {
      const customWs = client as CustomWebSocket;
      if (customWs.isAlive === false) {
        return customWs.terminate();
      }
      customWs.isAlive = false;
      customWs.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  return wss;
}

export function sendToUser(userId: string, data: unknown): void {
  const sockets = userSockets.get(userId);
  if (!sockets || sockets.size === 0) return;

  const payload = JSON.stringify(data);
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}
