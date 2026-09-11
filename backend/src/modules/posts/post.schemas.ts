import { z } from "zod";

export const postMediaItemSchema = z.object({
  url: z.string().min(1),
  type: z.enum(["image", "video", "gif"]),
});

export const createPostSchema = z.object({
  title: z
    .string({ required_error: "Post title is required" })
    .min(1, "Post title cannot be empty")
    .max(300, "Post title cannot exceed 300 characters"),
  content: z.string().max(10000).optional().nullable(),
  mediaUrl: z.string().optional().nullable().or(z.literal("")),
  media: z.array(postMediaItemSchema).max(10).optional(),
  communityId: z.string().uuid().optional().nullable(),
  communityName: z.string().optional().nullable(),
});

export const listPostsQuerySchema = z.object({
  communityName: z.string().optional(),
  communityId: z.string().uuid().optional(),
  authorUsername: z.string().optional(),
  authorId: z.string().uuid().optional(),
  sort: z.enum(["best", "top", "new"]).default("best"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const votePostSchema = z.object({
  value: z
    .number()
    .int()
    .refine((v) => v === 1 || v === -1 || v === 0, {
      message: "Vote value must be 1 (upvote), -1 (downvote), or 0 (cancel)",
    }),
});

export const voteCommentSchema = z.object({
  value: z
    .number()
    .int()
    .refine((v) => v === 1 || v === -1 || v === 0, {
      message: "Vote value must be 1 (upvote), -1 (downvote), or 0 (cancel)",
    }),
});

export const createCommentSchema = z.object({
  content: z
    .string({ required_error: "Comment content is required" })
    .min(1, "Comment content cannot be empty")
    .max(5000, "Comment cannot exceed 5000 characters"),
  parentId: z.string().uuid().optional().nullable(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>;
export type VotePostInput = z.infer<typeof votePostSchema>;
export type VoteCommentInput = z.infer<typeof voteCommentSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
