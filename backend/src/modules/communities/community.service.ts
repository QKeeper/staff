import path from "node:path";
import fs from "node:fs/promises";
import { prisma, Prisma } from "../../db/prisma.js";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../common/errors/appError.js";
import { ROLE_DEFAULT_PERMISSIONS } from "../../common/permissions/permissions.js";
import { deleteLocalUpload } from "../../common/utils/fileStorage.js";
import {
  CreateCommunityInput,
  ListCommunitiesQuery,
} from "./community.schemas.js";

export class CommunityService {
  static async createCommunity(userId: string, input: CreateCommunityInput) {
    const existing = await prisma.community.findFirst({
      where: {
        name: {
          equals: input.name,
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      throw new ConflictError("A community with this name already exists");
    }

    return await prisma.$transaction(async (tx) => {
      const community = await tx.community.create({
        data: {
          name: input.name,
          displayName: input.displayName || input.name,
          description: input.description,
          topic: input.topic,
          isPrivate: input.isPrivate,
          creatorId: userId,
        },
      });

      const member = await tx.communityMember.create({
        data: {
          userId,
          communityId: community.id,
          role: "OWNER",
          permissions: ROLE_DEFAULT_PERMISSIONS.OWNER,
        },
      });

      return {
        ...community,
        membersCount: 1,
        currentUserMembership: {
          role: member.role,
          permissions: member.permissions,
        },
      };
    });
  }

  static async getCommunityByName(name: string, currentUserId?: string) {
    const community = await prisma.community.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!community) {
      throw new NotFoundError(`Community '${name}' not found`);
    }

    let currentUserMembership = null;
    let isFollowing = false;
    if (currentUserId) {
      const [membership, follow] = await Promise.all([
        prisma.communityMember.findUnique({
          where: {
            userId_communityId: {
              userId: currentUserId,
              communityId: community.id,
            },
          },
          select: {
            role: true,
            permissions: true,
            joinedAt: true,
          },
        }),
        prisma.communityFollow.findUnique({
          where: {
            userId_communityId: {
              userId: currentUserId,
              communityId: community.id,
            },
          },
        }),
      ]);
      currentUserMembership = membership;
      isFollowing = Boolean(follow);
    }

    return {
      id: community.id,
      name: community.name,
      displayName: community.displayName,
      description: community.description,
      topic: community.topic,
      isPrivate: community.isPrivate,
      avatarUrl: community.avatarUrl,
      bannerUrl: community.bannerUrl,
      creatorId: community.creatorId,
      createdAt: community.createdAt,
      creator: community.creator,
      membersCount: community._count.members,
      currentUserMembership,
      isFollowing,
    };
  }

  static async listCommunities(query: ListCommunitiesQuery) {
    const { page, limit, topic, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CommunityWhereInput = {};

    if (topic) {
      where.topic = topic;
    }

    if (search) {
      const cleanSearch = search.trim().replace(/^(\/r\/|r\/|@)/i, "");
      const searchTerm = cleanSearch || search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { displayName: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    const [total, communities] = await Promise.all([
      prisma.community.count({ where }),
      prisma.community.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { members: true },
          },
        },
      }),
    ]);

    const items = communities.map((comm) => ({
      id: comm.id,
      name: comm.name,
      displayName: comm.displayName,
      description: comm.description,
      topic: comm.topic,
      isPrivate: comm.isPrivate,
      avatarUrl: comm.avatarUrl,
      bannerUrl: comm.bannerUrl,
      createdAt: comm.createdAt,
      membersCount: comm._count.members,
    }));

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getUserCommunities(userId: string) {
    const memberships = await prisma.communityMember.findMany({
      where: { userId },
      orderBy: { joinedAt: "desc" },
      include: {
        community: {
          include: {
            _count: {
              select: { members: true },
            },
          },
        },
      },
    });

    return memberships.map((m) => ({
      id: m.community.id,
      name: m.community.name,
      displayName: m.community.displayName,
      description: m.community.description,
      topic: m.community.topic,
      avatarUrl: m.community.avatarUrl,
      bannerUrl: m.community.bannerUrl,
      role: m.role,
      permissions: m.permissions,
      membersCount: m.community._count.members,
      joinedAt: m.joinedAt,
    }));
  }

  static async followCommunity(userId: string, communityName: string) {
    const community = await prisma.community.findFirst({
      where: {
        name: {
          equals: communityName,
          mode: "insensitive",
        },
      },
    });

    if (!community) {
      throw new NotFoundError(`Community '${communityName}' not found`);
    }

    await prisma.communityFollow.upsert({
      where: {
        userId_communityId: {
          userId,
          communityId: community.id,
        },
      },
      create: {
        userId,
        communityId: community.id,
      },
      update: {},
    });

    return { isFollowing: true };
  }

  static async unfollowCommunity(userId: string, communityName: string) {
    const community = await prisma.community.findFirst({
      where: {
        name: {
          equals: communityName,
          mode: "insensitive",
        },
      },
    });

    if (!community) {
      throw new NotFoundError(`Community '${communityName}' not found`);
    }

    await prisma.communityFollow.deleteMany({
      where: {
        userId,
        communityId: community.id,
      },
    });

    return { isFollowing: false };
  }

  private static async saveImage(
    entityId: string,
    subfolder: "community-avatars" | "community-banners",
    imageData: string,
  ): Promise<string> {
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

    const fileName = `${entityId}-${Date.now()}.${ext}`;
    const filePath = path.join(dir, fileName);
    await fs.writeFile(filePath, buffer);

    return `/api/uploads/${subfolder}/${fileName}`;
  }

  private static async verifyCanEditCommunity(
    communityName: string,
    userId: string,
    isGlobalAdmin: boolean = false,
  ) {
    const community = await prisma.community.findFirst({
      where: {
        name: {
          equals: communityName,
          mode: "insensitive",
        },
      },
    });

    if (!community) {
      throw new NotFoundError(`Community '${communityName}' not found`);
    }

    if (isGlobalAdmin || community.creatorId === userId) {
      return community;
    }

    const membership = await prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId: community.id,
        },
      },
    });

    if (
      !membership ||
      (membership.role !== "OWNER" && membership.role !== "ADMIN")
    ) {
      throw new ForbiddenError(
        "You do not have permission to edit this community",
      );
    }

    return community;
  }

  static async updateAvatar(
    communityName: string,
    userId: string,
    imageData: string,
    isGlobalAdmin: boolean = false,
  ) {
    const community = await this.verifyCanEditCommunity(
      communityName,
      userId,
      isGlobalAdmin,
    );
    const avatarUrl = await this.saveImage(
      community.id,
      "community-avatars",
      imageData,
    );

    const updated = await prisma.community.update({
      where: { id: community.id },
      data: { avatarUrl },
    });

    if (community.avatarUrl && community.avatarUrl !== avatarUrl) {
      await deleteLocalUpload(community.avatarUrl);
    }

    return updated;
  }

  static async updateBanner(
    communityName: string,
    userId: string,
    imageData: string,
    isGlobalAdmin: boolean = false,
  ) {
    const community = await this.verifyCanEditCommunity(
      communityName,
      userId,
      isGlobalAdmin,
    );
    const bannerUrl = await this.saveImage(
      community.id,
      "community-banners",
      imageData,
    );

    const updated = await prisma.community.update({
      where: { id: community.id },
      data: { bannerUrl },
    });

    if (community.bannerUrl && community.bannerUrl !== bannerUrl) {
      await deleteLocalUpload(community.bannerUrl);
    }

    return updated;
  }
}
