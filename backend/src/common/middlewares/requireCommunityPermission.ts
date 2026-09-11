import { NextFunction, Request, Response } from "express";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../errors/appError.js";
import {
  CommunityPermissionType,
  hasCommunityPermission,
} from "../permissions/permissions.js";
import { prisma } from "../../db/prisma.js";

export const requireCommunityPermission =
  (permission: CommunityPermissionType) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    const rawIdentifier = req.params.communityId || req.params.name;
    const communityNameOrId = Array.isArray(rawIdentifier)
      ? rawIdentifier[0]
      : rawIdentifier;

    if (!communityNameOrId || typeof communityNameOrId !== "string") {
      return next(
        new NotFoundError("Community identifier not provided in route params"),
      );
    }

    const community = await prisma.community.findFirst({
      where: {
        OR: [{ id: communityNameOrId }, { name: communityNameOrId }],
      },
      select: { id: true },
    });

    if (!community) {
      return next(new NotFoundError("Community not found"));
    }

    const membership = await prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId: req.user.id,
          communityId: community.id,
        },
      },
    });

    const isGlobalAdmin = req.user.role === "ADMIN";
    const allowed = hasCommunityPermission(
      membership,
      permission,
      isGlobalAdmin,
    );

    if (!allowed) {
      return next(
        new ForbiddenError("You do not have permission to perform this action"),
      );
    }

    next();
  };
