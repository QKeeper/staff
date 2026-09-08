import { Request, Response } from "express";
import { PostService } from "./post.service.js";
import { sendSuccess } from "../../common/responses/apiResponse.js";
import { ListPostsQuery, VotePostInput } from "./post.schemas.js";

export class PostController {
  static async create(req: Request, res: Response): Promise<void> {
    const post = await PostService.createPost(req.user!.id, req.body);
    sendSuccess(res, post, undefined, 201);
  }

  static async list(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ListPostsQuery;
    const result = await PostService.listPosts(query, req.user?.id);
    sendSuccess(res, result.items, result.meta);
  }

  static async getById(req: Request, res: Response): Promise<void> {
    const rawId = req.params.id;
    const postId = Array.isArray(rawId) ? rawId[0] : rawId;
    const post = await PostService.getPostById(postId, req.user?.id);
    sendSuccess(res, post);
  }

  static async vote(req: Request, res: Response): Promise<void> {
    const rawId = req.params.id;
    const postId = Array.isArray(rawId) ? rawId[0] : rawId;
    const { value } = req.body as VotePostInput;
    const result = await PostService.votePost(req.user!.id, postId, value);
    sendSuccess(res, result);
  }

  static async createComment(req: Request, res: Response): Promise<void> {
    const rawId = req.params.id;
    const postId = Array.isArray(rawId) ? rawId[0] : rawId;
    const { content } = req.body as { content: string };
    const comment = await PostService.createComment(
      req.user!.id,
      postId,
      content,
    );
    sendSuccess(res, comment, undefined, 201);
  }

  static async listComments(req: Request, res: Response): Promise<void> {
    const rawId = req.params.id;
    const postId = Array.isArray(rawId) ? rawId[0] : rawId;
    const comments = await PostService.listComments(postId);
    sendSuccess(res, comments);
  }
}
