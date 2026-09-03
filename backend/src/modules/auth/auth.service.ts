import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../../common/errors/appError.js";
import { LoginInput, RegisterInput } from "./auth.schemas.js";

// 1 Year in milliseconds (365 days)
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_EXPIRES_IN = "15m";

interface TokenPayload {
  id: string;
  username: string;
  email: string;
  globalRole: "USER" | "ADMIN";
}

export class AuthService {
  static generateAccessToken(user: TokenPayload): string {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        globalRole: user.globalRole,
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
    );
  }

  static generateRefreshToken(): string {
    return crypto.randomBytes(40).toString("hex");
  }

  static async register(
    input: RegisterInput,
    metadata?: { userAgent?: string; ipAddress?: string },
  ) {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: input.email }, { username: input.username }],
      },
    });

    if (existingUser) {
      if (existingUser.email.toLowerCase() === input.email.toLowerCase()) {
        throw new ConflictError("User with this email already exists");
      }
      throw new ConflictError("Username is already taken");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const user = await prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash,
      },
      select: {
        id: true,
        username: true,
        email: true,
        globalRole: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
      },
    });

    const refreshToken = this.generateRefreshToken();
    const expiresAt = new Date(Date.now() + ONE_YEAR_MS);

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
      },
    });

    const accessToken = this.generateAccessToken(user);

    return {
      user,
      accessToken,
      refreshToken,
      refreshTokenExpiresAt: expiresAt,
    };
  }

  static async login(
    input: LoginInput,
    metadata?: { userAgent?: string; ipAddress?: string },
  ) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: input.login }, { username: input.login }],
      },
    });

    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const refreshToken = this.generateRefreshToken();
    const expiresAt = new Date(Date.now() + ONE_YEAR_MS);

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
      },
    });

    const userPayload: TokenPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      globalRole: user.globalRole,
    };

    const accessToken = this.generateAccessToken(userPayload);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        globalRole: user.globalRole,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
      refreshTokenExpiresAt: expiresAt,
    };
  }

  static async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedError("Refresh token is required");
    }

    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedError("Invalid refresh session");
    }

    if (new Date() > session.expiresAt) {
      await prisma.session.delete({ where: { id: session.id } });
      throw new UnauthorizedError("Refresh token has expired");
    }

    // Token rotation for added security while preserving 1-year lifetime
    const newRefreshToken = this.generateRefreshToken();
    const newExpiresAt = new Date(Date.now() + ONE_YEAR_MS);

    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        expiresAt: newExpiresAt,
      },
    });

    const userPayload: TokenPayload = {
      id: session.user.id,
      username: session.user.username,
      email: session.user.email,
      globalRole: session.user.globalRole,
    };

    const accessToken = this.generateAccessToken(userPayload);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      refreshTokenExpiresAt: newExpiresAt,
    };
  }

  static async logout(refreshToken?: string) {
    if (!refreshToken) return;
    try {
      await prisma.session.delete({
        where: { refreshToken },
      });
    } catch {
      // Ignore if session not found
    }
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        globalRole: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            createdCommunities: true,
            memberships: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return user;
  }
}
