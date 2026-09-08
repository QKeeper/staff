import { apiSlice } from "../api/apiSlice";
import type { Post, Comment, UserComment } from "@/api/client";

export interface GetPostsParams {
  communityName?: string;
  communityId?: string;
  authorUsername?: string;
  authorId?: string;
  sort?: "best" | "top" | "new";
  page?: number;
  limit?: number;
}

export const postsApiSlice = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getPosts: build.query<Post[], GetPostsParams | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.communityName)
          searchParams.set("communityName", params.communityName);
        if (params?.communityId)
          searchParams.set("communityId", params.communityId);
        if (params?.authorUsername)
          searchParams.set("authorUsername", params.authorUsername);
        if (params?.authorId) searchParams.set("authorId", params.authorId);
        if (params?.sort) searchParams.set("sort", params.sort);
        if (params?.page) searchParams.set("page", String(params.page));
        if (params?.limit) searchParams.set("limit", String(params.limit));
        const qs = searchParams.toString();
        return `/posts${qs ? `?${qs}` : ""}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Post" as const, id })),
              { type: "Post", id: "LIST" },
            ]
          : [{ type: "Post", id: "LIST" }],
    }),
    getPostById: build.query<Post, string>({
      query: (id) => `/posts/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Post", id }],
    }),
    createPost: build.mutation<
      Post,
      {
        title: string;
        content?: string;
        mediaUrl?: string;
        communityId?: string;
        communityName?: string;
      }
    >({
      query: (data) => ({
        url: "/posts",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Post", id: "LIST" }, "Community"],
    }),
    votePost: build.mutation<
      {
        postId: string;
        upvotes: number;
        downvotes: number;
        score: number;
        userVote: number;
      },
      { id: string; value: number }
    >({
      query: ({ id, value }) => ({
        url: `/posts/${id}/vote`,
        method: "POST",
        body: { value },
      }),
      async onQueryStarted({ id, value }, { dispatch, queryFulfilled }) {
        // Optimistic update for getPostById
        const patchResultSingle = dispatch(
          postsApiSlice.util.updateQueryData("getPostById", id, (draft) => {
            const oldVote = draft.userVote || 0;
            const diff = value - oldVote;
            draft.score += diff;
            if (oldVote === 1) draft.upvotes -= 1;
            if (oldVote === -1) draft.downvotes -= 1;
            if (value === 1) draft.upvotes += 1;
            if (value === -1) draft.downvotes += 1;
            draft.userVote = value;
          }),
        );

        try {
          const { data } = await queryFulfilled;
          dispatch(
            postsApiSlice.util.updateQueryData("getPostById", id, (draft) => {
              draft.score = data.score;
              draft.upvotes = data.upvotes;
              draft.downvotes = data.downvotes;
              draft.userVote = data.userVote;
            }),
          );
        } catch {
          patchResultSingle.undo();
        }
      },
      invalidatesTags: (_result, _error, { id }) => [{ type: "Post", id }],
    }),
    listPostComments: build.query<Comment[], string>({
      query: (postId) => `/posts/${postId}/comments`,
      providesTags: (result, _error, postId) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Comment" as const, id })),
              { type: "Comment", id: `POST_${postId}` },
            ]
          : [{ type: "Comment", id: `POST_${postId}` }],
    }),
    listUserComments: build.query<UserComment[], string>({
      query: (username) =>
        `/posts/user/${encodeURIComponent(username)}/comments`,
      providesTags: (result, _error, username) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Comment" as const, id })),
              { type: "Comment", id: `USER_${username.toLowerCase()}` },
            ]
          : [{ type: "Comment", id: `USER_${username.toLowerCase()}` }],
    }),
    createComment: build.mutation<
      Comment,
      { postId: string; content: string; parentId?: string | null }
    >({
      query: ({ postId, content, parentId }) => ({
        url: `/posts/${postId}/comments`,
        method: "POST",
        body: { content, parentId },
      }),
      invalidatesTags: (_result, _error, { postId }) => [
        { type: "Comment", id: `POST_${postId}` },
        { type: "Post", id: postId },
        "Comment",
      ],
    }),
    voteComment: build.mutation<
      {
        commentId: string;
        upvotes: number;
        downvotes: number;
        score: number;
        userVote: number;
      },
      { id: string; value: number }
    >({
      query: ({ id, value }) => ({
        url: `/posts/comments/${id}/vote`,
        method: "POST",
        body: { value },
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: "Comment", id }],
    }),
  }),
});

export const {
  useGetPostsQuery,
  useGetPostByIdQuery,
  useCreatePostMutation,
  useVotePostMutation,
  useListPostCommentsQuery,
  useListUserCommentsQuery,
  useCreateCommentMutation,
  useVoteCommentMutation,
} = postsApiSlice;
