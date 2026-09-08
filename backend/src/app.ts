import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { communityRoutes } from "./modules/communities/community.routes.js";
import { postRoutes } from "./modules/posts/post.routes.js";
import { errorHandler } from "./common/middlewares/errorHandler.js";
import { NotFoundError } from "./common/errors/appError.js";
import { sendSuccess } from "./common/responses/apiResponse.js";

export const createApp = (): Express => {
  const app = express();

  // Security & standard middlewares
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mock delay in development mode (500ms)
  if (env.NODE_ENV === "development") {
    app.use((_req, _res, next) => {
      setTimeout(next, 500);
    });
  }

  // Health check
  app.get("/health", (_req, res) => {
    sendSuccess(res, { status: "ok", timestamp: new Date().toISOString() });
  });

  // API v1 Routes
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/communities", communityRoutes);
  app.use("/api/v1/posts", postRoutes);

  // Catch 404 for undefined routes
  app.use((_req, _res, next) => {
    next(new NotFoundError("Route not found"));
  });

  // Centralized error handler
  app.use(errorHandler);

  return app;
};
