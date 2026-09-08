import { CookieOptions, Request, Response } from "express";
import { AuthService } from "./auth.service.js";
import { sendSuccess } from "../../common/responses/apiResponse.js";
import { env } from "../../config/env.js";

const isProd = env.NODE_ENV === "production";

const ACCESS_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax",
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: "/",
};

const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax",
  maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
  path: "/api/v1/auth",
};

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    const metadata = {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip || req.socket.remoteAddress,
    };

    const result = await AuthService.register(req.body, metadata);

    res.cookie("access_token", result.accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie("refresh_token", result.refreshToken, REFRESH_COOKIE_OPTIONS);

    sendSuccess(
      res,
      {
        user: result.user,
        accessToken: result.accessToken,
      },
      undefined,
      201,
    );
  }

  static async login(req: Request, res: Response): Promise<void> {
    const metadata = {
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip || req.socket.remoteAddress,
    };

    const result = await AuthService.login(req.body, metadata);

    res.cookie("access_token", result.accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie("refresh_token", result.refreshToken, REFRESH_COOKIE_OPTIONS);

    sendSuccess(res, {
      user: result.user,
      accessToken: result.accessToken,
    });
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    const token = req.cookies?.refresh_token || req.body?.refreshToken;
    const result = await AuthService.refresh(token);

    res.cookie("access_token", result.accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie("refresh_token", result.refreshToken, REFRESH_COOKIE_OPTIONS);

    sendSuccess(res, {
      accessToken: result.accessToken,
    });
  }

  static async logout(req: Request, res: Response): Promise<void> {
    const token = req.cookies?.refresh_token || req.body?.refreshToken;
    await AuthService.logout(token);

    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/api/v1/auth" });

    sendSuccess(res, { message: "Logged out successfully" });
  }

  static async me(req: Request, res: Response): Promise<void> {
    const user = await AuthService.getMe(req.user!.id);
    sendSuccess(res, { user });
  }

  static async getUserProfile(req: Request, res: Response): Promise<void> {
    const rawUsername = req.params.username;
    const username = Array.isArray(rawUsername) ? rawUsername[0] : rawUsername;
    const user = await AuthService.getUserProfile(username);
    sendSuccess(res, { user });
  }
}
