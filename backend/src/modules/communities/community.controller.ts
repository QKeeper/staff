import { Request, Response } from "express";
import { CommunityService } from "./community.service.js";
import { sendSuccess } from "../../common/responses/apiResponse.js";
import { BadRequestError } from "../../common/errors/appError.js";
import { ListCommunitiesQuery } from "./community.schemas.js";

export class CommunityController {
  static async create(req: Request, res: Response): Promise<void> {
    const community = await CommunityService.createCommunity(
      req.user!.id,
      req.body,
    );
    sendSuccess(res, community, undefined, 201);
  }

  static async getByName(req: Request, res: Response): Promise<void> {
    const rawName = req.params.name;
    const name = Array.isArray(rawName) ? rawName[0] : rawName;
    const community = await CommunityService.getCommunityByName(
      name,
      req.user?.id,
    );
    sendSuccess(res, community);
  }

  static async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListCommunitiesQuery;
    const result = await CommunityService.listCommunities(query);
    sendSuccess(res, result.items, result.meta);
  }

  static async getMyCommunities(req: Request, res: Response): Promise<void> {
    const communities = await CommunityService.getUserCommunities(req.user!.id);
    sendSuccess(res, communities);
  }

  static async follow(req: Request, res: Response): Promise<void> {
    const rawName = req.params.name;
    const name = Array.isArray(rawName) ? rawName[0] : rawName;
    const result = await CommunityService.followCommunity(req.user!.id, name);
    sendSuccess(res, result);
  }

  static async unfollow(req: Request, res: Response): Promise<void> {
    const rawName = req.params.name;
    const name = Array.isArray(rawName) ? rawName[0] : rawName;
    const result = await CommunityService.unfollowCommunity(req.user!.id, name);
    sendSuccess(res, result);
  }

  static async updateAvatar(req: Request, res: Response): Promise<void> {
    const rawName = req.params.name;
    const name = Array.isArray(rawName) ? rawName[0] : rawName;
    const { image } = req.body;
    if (!image || typeof image !== "string") {
      throw new BadRequestError("Image data is required");
    }
    const community = await CommunityService.updateAvatar(
      name,
      req.user!.id,
      image,
      req.user!.role === "ADMIN",
    );
    sendSuccess(res, { community });
  }

  static async updateBanner(req: Request, res: Response): Promise<void> {
    const rawName = req.params.name;
    const name = Array.isArray(rawName) ? rawName[0] : rawName;
    const { image } = req.body;
    if (!image || typeof image !== "string") {
      throw new BadRequestError("Image data is required");
    }
    const community = await CommunityService.updateBanner(
      name,
      req.user!.id,
      image,
      req.user!.role === "ADMIN",
    );
    sendSuccess(res, { community });
  }
}
