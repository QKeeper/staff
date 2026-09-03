import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { UnauthorizedError } from "../errors/appError.js";

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  globalRole: "USER" | "ADMIN";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  if (req.cookies?.access_token) {
    return req.cookies.access_token;
  }
  return null;
};

export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const token = extractToken(req);

  if (!token) {
    throw new UnauthorizedError("Authentication token is missing");
  }

  try {
    const payload = jwt.verify(
      token,
      env.JWT_ACCESS_SECRET,
    ) as AuthenticatedUser;
    req.user = {
      id: payload.id,
      username: payload.username,
      email: payload.email,
      globalRole: payload.globalRole,
    };
    next();
  } catch (_error) {
    throw new UnauthorizedError("Invalid or expired authentication token");
  }
};

export const optionalAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const token = extractToken(req);
  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(
      token,
      env.JWT_ACCESS_SECRET,
    ) as AuthenticatedUser;
    req.user = {
      id: payload.id,
      username: payload.username,
      email: payload.email,
      globalRole: payload.globalRole,
    };
  } catch {
    // Ignore invalid tokens for optional auth
  }

  next();
};
