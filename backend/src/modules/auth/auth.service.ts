import fs from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../../common/errors/appError.js";
import { deleteLocalUpload } from "../../common/utils/fileStorage.js";
import { LoginInput, RegisterInput } from "./auth.schemas.js";

// 1 Year in milliseconds (365 days)
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_EXPIRES_IN = "15m";

interface TokenPayload {
  id: string;
  username: string;
  email: string;
  role: "USER" | "ADMIN" | "MODERATOR";
}

export class AuthService {
  static generateAccessToken(user: TokenPayload): string {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        globalRole: user.role,
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
    const username = input.username.trim();
    const email = input.email.trim();

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: email, mode: "insensitive" } },
          { username: { equals: username, mode: "insensitive" } },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email.toLowerCase() === email.toLowerCase()) {
        throw new ConflictError("User with this email already exists");
      }
      throw new ConflictError("Username is already taken");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        role: true,
        avatarUrl: true,
        bannerUrl: true,
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
    const loginValue = input.login.trim();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: loginValue, mode: "insensitive" } },
          { username: { equals: loginValue, mode: "insensitive" } },
        ],
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
      role: user.role,
    };

    const accessToken = this.generateAccessToken(userPayload);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        bannerUrl: user.bannerUrl,
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
      role: session.user.role,
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
        displayName: true,
        role: true,
        avatarUrl: true,
        bannerUrl: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            createdCommunities: true,
            memberships: true,
            posts: true,
            comments: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    return user;
  }

  static async getUserProfile(username: string, currentUserId?: string) {
    const user = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        avatarUrl: true,
        bannerUrl: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            comments: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    let isFollowing = false;
    if (currentUserId && currentUserId !== user.id) {
      const follow = await prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: user.id,
          },
        },
      });
      isFollowing = !!follow;
    }

    const [postAgg, commentAgg] = await Promise.all([
      prisma.post.aggregate({
        where: { authorId: user.id },
        _sum: { upvotes: true, downvotes: true },
      }),
      prisma.comment.aggregate({
        where: { authorId: user.id },
        _sum: { upvotes: true, downvotes: true },
      }),
    ]);
    const karma =
      (postAgg._sum.upvotes || 0) -
      (postAgg._sum.downvotes || 0) +
      (commentAgg._sum.upvotes || 0) -
      (commentAgg._sum.downvotes || 0);

    return {
      ...user,
      isFollowing,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      karma,
    };
  }

  static async followUser(followerId: string, username: string) {
    const targetUser = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: "insensitive",
        },
      },
    });

    if (!targetUser) {
      throw new NotFoundError("User not found");
    }

    if (targetUser.id === followerId) {
      throw new BadRequestError("You cannot follow yourself");
    }

    await prisma.userFollow.upsert({
      where: {
        followerId_followingId: {
          followerId,
          followingId: targetUser.id,
        },
      },
      create: {
        followerId,
        followingId: targetUser.id,
      },
      update: {},
    });

    const followersCount = await prisma.userFollow.count({
      where: { followingId: targetUser.id },
    });

    return {
      isFollowing: true,
      followersCount,
    };
  }

  static async unfollowUser(followerId: string, username: string) {
    const targetUser = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: "insensitive",
        },
      },
    });

    if (!targetUser) {
      throw new NotFoundError("User not found");
    }

    await prisma.userFollow.deleteMany({
      where: {
        followerId,
        followingId: targetUser.id,
      },
    });

    const followersCount = await prisma.userFollow.count({
      where: { followingId: targetUser.id },
    });

    return {
      isFollowing: false,
      followersCount,
    };
  }

  private static async saveImage(
    userId: string,
    subfolder: "avatars" | "banners",
    imageData: string,
  ): Promise<string> {
    if (imageData.startsWith("http://") || imageData.startsWith("https://")) {
      return imageData;
    }

    const match = imageData.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!match) {
      if (imageData.startsWith("/api/uploads/")) {
        return imageData;
      }
      if (imageData.startsWith("/uploads/")) {
        return `/api${imageData}`;
      }
      throw new BadRequestError("Invalid image data format");
    }

    let ext = match[1].toLowerCase();
    if (ext === "jpeg") ext = "jpg";
    if (ext === "svg+xml") ext = "svg";

    const base64Content = match[2];
    const buffer = Buffer.from(base64Content, "base64");

    if (buffer.length > 10 * 1024 * 1024) {
      throw new BadRequestError("Image size must not exceed 10MB");
    }

    const dir = path.resolve(process.cwd(), "uploads", subfolder);
    await fs.mkdir(dir, { recursive: true });

    const fileName = `${userId}-${Date.now()}.${ext}`;
    const filePath = path.join(dir, fileName);
    await fs.writeFile(filePath, buffer);

    return `/api/uploads/${subfolder}/${fileName}`;
  }

  static async updateAvatar(userId: string, imageData: string) {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    const avatarUrl = await this.saveImage(userId, "avatars", imageData);
    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        role: true,
        avatarUrl: true,
        bannerUrl: true,
        bio: true,
        createdAt: true,
      },
    });

    if (existingUser?.avatarUrl && existingUser.avatarUrl !== avatarUrl) {
      await deleteLocalUpload(existingUser.avatarUrl);
    }

    return user;
  }

  static async updateBanner(userId: string, imageData: string) {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { bannerUrl: true },
    });

    const bannerUrl = await this.saveImage(userId, "banners", imageData);
    const user = await prisma.user.update({
      where: { id: userId },
      data: { bannerUrl },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        role: true,
        avatarUrl: true,
        bannerUrl: true,
        bio: true,
        createdAt: true,
      },
    });

    if (existingUser?.bannerUrl && existingUser.bannerUrl !== bannerUrl) {
      await deleteLocalUpload(existingUser.bannerUrl);
    }

    return user;
  }
}
