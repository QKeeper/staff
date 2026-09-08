import { prisma, Prisma } from "../../db/prisma.js";
import { NotFoundError } from "../../common/errors/appError.js";
import { CreatePostInput, ListPostsQuery } from "./post.schemas.js";

export class PostService {
  static async createPost(userId: string, input: CreatePostInput) {
    let communityId = input.communityId;

    if (!communityId && input.communityName) {
      const community = await prisma.community.findFirst({
        where: {
          name: {
            equals: input.communityName,
            mode: "insensitive",
          },
        },
      });
      if (community) {
        communityId = community.id;
      }
    }

    const post = await prisma.post.create({
      data: {
        title: input.title,
        content: input.content || null,
        mediaUrl: input.mediaUrl || null,
        authorId: userId,
        communityId: communityId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
      },
    });

    return {
      ...post,
      score: post.upvotes - post.downvotes,
      userVote: 0,
    };
  }

  static async listPosts(query: ListPostsQuery, currentUserId?: string) {
    const {
      communityName,
      communityId,
      authorUsername,
      authorId,
      sort,
      page,
      limit,
    } = query;

    let targetCommunityId = communityId;
    if (!targetCommunityId && communityName) {
      const comm = await prisma.community.findFirst({
        where: {
          name: {
            equals: communityName,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });
      if (!comm) {
        return {
          items: [],
          meta: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        };
      }
      targetCommunityId = comm.id;
    }

    const where: Prisma.PostWhereInput = {};
    if (targetCommunityId) {
      where.communityId = targetCommunityId;
    }
    if (authorUsername) {
      where.author = {
        username: {
          equals: authorUsername,
          mode: "insensitive",
        },
      };
    } else if (authorId) {
      where.authorId = authorId;
    }

    let orderBy: Prisma.PostOrderByWithRelationInput[] = [];
    if (sort === "new") {
      orderBy = [{ createdAt: "desc" }];
    } else if (sort === "top") {
      orderBy = [{ upvotes: "desc" }, { createdAt: "desc" }];
    } else {
      // "best": by upvotes then createdAt
      orderBy = [{ upvotes: "desc" }, { createdAt: "desc" }];
    }

    const [total, posts] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          community: {
            select: {
              id: true,
              name: true,
              displayName: true,
            },
          },
          _count: {
            select: { comments: true },
          },
          ...(currentUserId
            ? {
                votes: {
                  where: { userId: currentUserId },
                  select: { value: true },
                },
              }
            : {}),
        },
      }),
    ]);

    const items = posts.map((post) => {
      let userVote = 0;
      if (
        "votes" in post &&
        Array.isArray(post.votes) &&
        post.votes.length > 0
      ) {
        userVote = post.votes[0].value;
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { votes: _votes, _count, ...rest } = post;
      return {
        ...rest,
        score: rest.upvotes - rest.downvotes,
        userVote,
        commentsCount: _count?.comments ?? 0,
      };
    });

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

  static async getPostById(postId: string, currentUserId?: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
        _count: {
          select: { comments: true },
        },
        ...(currentUserId
          ? {
              votes: {
                where: { userId: currentUserId },
                select: { value: true },
              },
            }
          : {}),
      },
    });

    if (!post) {
      throw new NotFoundError("Post not found");
    }

    let userVote = 0;
    if ("votes" in post && Array.isArray(post.votes) && post.votes.length > 0) {
      userVote = post.votes[0].value;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { votes: _votes, _count, ...rest } = post;
    return {
      ...rest,
      score: rest.upvotes - rest.downvotes,
      userVote,
      commentsCount: _count?.comments ?? 0,
    };
  }

  static async votePost(userId: string, postId: string, value: number) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundError("Post not found");
    }

    const existingVote = await prisma.postVote.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    await prisma.$transaction(async (tx) => {
      if (value === 0) {
        if (existingVote) {
          await tx.postVote.delete({
            where: { id: existingVote.id },
          });
          if (existingVote.value === 1) {
            await tx.post.update({
              where: { id: postId },
              data: { upvotes: { decrement: 1 } },
            });
          } else if (existingVote.value === -1) {
            await tx.post.update({
              where: { id: postId },
              data: { downvotes: { decrement: 1 } },
            });
          }
        }
      } else {
        if (!existingVote) {
          await tx.postVote.create({
            data: {
              userId,
              postId,
              value,
            },
          });
          if (value === 1) {
            await tx.post.update({
              where: { id: postId },
              data: { upvotes: { increment: 1 } },
            });
          } else {
            await tx.post.update({
              where: { id: postId },
              data: { downvotes: { increment: 1 } },
            });
          }
        } else if (existingVote.value !== value) {
          await tx.postVote.update({
            where: { id: existingVote.id },
            data: { value },
          });
          if (value === 1) {
            await tx.post.update({
              where: { id: postId },
              data: {
                upvotes: { increment: 1 },
                downvotes: { decrement: 1 },
              },
            });
          } else {
            await tx.post.update({
              where: { id: postId },
              data: {
                upvotes: { decrement: 1 },
                downvotes: { increment: 1 },
              },
            });
          }
        }
      }
    });

    const updated = await prisma.post.findUnique({
      where: { id: postId },
      select: { upvotes: true, downvotes: true },
    });

    return {
      postId,
      upvotes: updated?.upvotes || 0,
      downvotes: updated?.downvotes || 0,
      score: (updated?.upvotes || 0) - (updated?.downvotes || 0),
      userVote: value,
    };
  }

  static async createComment(
    userId: string,
    postId: string,
    content: string,
    parentId?: string | null,
  ) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) {
      throw new NotFoundError("Post not found");
    }

    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { id: true, postId: true },
      });
      if (!parentComment || parentComment.postId !== postId) {
        throw new NotFoundError("Parent comment not found on this post");
      }
    }

    const comment = await prisma.comment.create({
      data: {
        postId,
        authorId: userId,
        content,
        parentId: parentId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      ...comment,
      score: 0,
      userVote: 0,
    };
  }

  static async listComments(postId: string, currentUserId?: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) {
      throw new NotFoundError("Post not found");
    }

    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        ...(currentUserId
          ? {
              votes: {
                where: { userId: currentUserId },
                select: { value: true },
              },
            }
          : {}),
      },
    });

    return comments.map((comment) => {
      let userVote = 0;
      if (
        "votes" in comment &&
        Array.isArray(comment.votes) &&
        comment.votes.length > 0
      ) {
        userVote = comment.votes[0].value;
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { votes: _votes, ...rest } = comment;
      return {
        ...rest,
        score: rest.upvotes - rest.downvotes,
        userVote,
      };
    });
  }

  static async listUserComments(username: string, currentUserId?: string) {
    const user = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const comments = await prisma.comment.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            community: {
              select: {
                name: true,
                displayName: true,
              },
            },
          },
        },
        ...(currentUserId
          ? {
              votes: {
                where: { userId: currentUserId },
                select: { value: true },
              },
            }
          : {}),
      },
    });

    return comments.map((comment) => {
      let userVote = 0;
      if (
        "votes" in comment &&
        Array.isArray(comment.votes) &&
        comment.votes.length > 0
      ) {
        userVote = comment.votes[0].value;
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { votes: _votes, ...rest } = comment;
      return {
        ...rest,
        score: rest.upvotes - rest.downvotes,
        userVote,
      };
    });
  }

  static async voteComment(userId: string, commentId: string, value: number) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundError("Comment not found");
    }

    const existingVote = await prisma.commentVote.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    });

    await prisma.$transaction(async (tx) => {
      if (value === 0) {
        if (existingVote) {
          await tx.commentVote.delete({
            where: { id: existingVote.id },
          });
          if (existingVote.value === 1) {
            await tx.comment.update({
              where: { id: commentId },
              data: { upvotes: { decrement: 1 } },
            });
          } else if (existingVote.value === -1) {
            await tx.comment.update({
              where: { id: commentId },
              data: { downvotes: { decrement: 1 } },
            });
          }
        }
      } else {
        if (!existingVote) {
          await tx.commentVote.create({
            data: {
              userId,
              commentId,
              value,
            },
          });
          if (value === 1) {
            await tx.comment.update({
              where: { id: commentId },
              data: { upvotes: { increment: 1 } },
            });
          } else {
            await tx.comment.update({
              where: { id: commentId },
              data: { downvotes: { increment: 1 } },
            });
          }
        } else if (existingVote.value !== value) {
          await tx.commentVote.update({
            where: { id: existingVote.id },
            data: { value },
          });
          if (value === 1) {
            await tx.comment.update({
              where: { id: commentId },
              data: {
                upvotes: { increment: 1 },
                downvotes: { decrement: 1 },
              },
            });
          } else {
            await tx.comment.update({
              where: { id: commentId },
              data: {
                upvotes: { decrement: 1 },
                downvotes: { increment: 1 },
              },
            });
          }
        }
      }
    });

    const updated = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { upvotes: true, downvotes: true },
    });

    return {
      commentId,
      upvotes: updated?.upvotes || 0,
      downvotes: updated?.downvotes || 0,
      score: (updated?.upvotes || 0) - (updated?.downvotes || 0),
      userVote: value,
    };
  }
}
