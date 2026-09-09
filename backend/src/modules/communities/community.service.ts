import { prisma, Prisma } from "../../db/prisma.js";
import { ConflictError, NotFoundError } from "../../common/errors/appError.js";
import { ROLE_DEFAULT_PERMISSIONS } from "../../common/permissions/permissions.js";
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
}
