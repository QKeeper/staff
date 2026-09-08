import { Request, Response } from "express";
import { PostService } from "./post.service.js";
import { sendSuccess } from "../../common/responses/apiResponse.js";
import { BadRequestError } from "../../common/errors/appError.js";
import { getMediaType } from "../../common/middlewares/mediaUpload.js";
import {
  ListPostsQuery,
  VotePostInput,
  VoteCommentInput,
} from "./post.schemas.js";

export class PostController {
  static async uploadMedia(req: Request, res: Response): Promise<void> {
    const files =
      (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);
    if (!files || files.length === 0) {
      throw new BadRequestError("No files uploaded");
    }

    const uploaded = files.map((file) => {
      const type = getMediaType(file.mimetype, file.filename);
      return {
        url: `/uploads/posts/${file.filename}`,
        type,
        name: file.originalname,
        size: file.size,
      };
    });

    sendSuccess(res, uploaded, undefined, 201);
  }

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
    const { content, parentId } = req.body as {
      content: string;
      parentId?: string | null;
    };
    const comment = await PostService.createComment(
      req.user!.id,
      postId,
      content,
      parentId,
    );
    sendSuccess(res, comment, undefined, 201);
  }

  static async listComments(req: Request, res: Response): Promise<void> {
    const rawId = req.params.id;
    const postId = Array.isArray(rawId) ? rawId[0] : rawId;
    const comments = await PostService.listComments(postId, req.user?.id);
    sendSuccess(res, comments);
  }

  static async listUserComments(req: Request, res: Response): Promise<void> {
    const rawUsername = req.params.username;
    const username = Array.isArray(rawUsername) ? rawUsername[0] : rawUsername;
    const comments = await PostService.listUserComments(username, req.user?.id);
    sendSuccess(res, comments);
  }

  static async voteComment(req: Request, res: Response): Promise<void> {
    const rawId = req.params.id;
    const commentId = Array.isArray(rawId) ? rawId[0] : rawId;
    const { value } = req.body as VoteCommentInput;
    const result = await PostService.voteComment(
      req.user!.id,
      commentId,
      value,
    );
    sendSuccess(res, result);
  }
}
