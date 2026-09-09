import { apiSlice } from "../api/apiSlice";
import type { User, UserProfile } from "@/api/client";

export const usersApiSlice = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getMe: build.query<{ user: User | null }, void>({
      query: () => "/auth/me",
      providesTags: (result) =>
        result?.user
          ? [
              { type: "User", id: "ME" },
              { type: "User", id: result.user.username.toLowerCase() },
            ]
          : [{ type: "User", id: "ME" }],
    }),
    getUserProfile: build.query<{ user: UserProfile }, string>({
      query: (username) => `/auth/users/${encodeURIComponent(username)}`,
      providesTags: (_result, _error, username) => [
        { type: "User", id: username.toLowerCase() },
      ],
    }),
    updateAvatar: build.mutation<{ user: User }, { image: string }>({
      query: (body) => ({
        url: "/auth/me/avatar",
        method: "PATCH",
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.user) {
            dispatch(
              usersApiSlice.util.updateQueryData(
                "getMe",
                undefined,
                (draft) => {
                  if (draft?.user) {
                    draft.user.avatarUrl = data.user.avatarUrl;
                  }
                },
              ),
            );
            dispatch(
              usersApiSlice.util.updateQueryData(
                "getUserProfile",
                data.user.username,
                (draft) => {
                  if (draft?.user) {
                    draft.user.avatarUrl = data.user.avatarUrl;
                  }
                },
              ),
            );
          }
        } catch {
          // ignore error
        }
      },
      invalidatesTags: ["User", "Post", "Comment"],
    }),
    updateBanner: build.mutation<{ user: User }, { image: string }>({
      query: (body) => ({
        url: "/auth/me/banner",
        method: "PATCH",
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.user) {
            dispatch(
              usersApiSlice.util.updateQueryData(
                "getMe",
                undefined,
                (draft) => {
                  if (draft?.user) {
                    draft.user.bannerUrl = data.user.bannerUrl;
                  }
                },
              ),
            );
            dispatch(
              usersApiSlice.util.updateQueryData(
                "getUserProfile",
                data.user.username,
                (draft) => {
                  if (draft?.user) {
                    draft.user.bannerUrl = data.user.bannerUrl;
                  }
                },
              ),
            );
          }
        } catch {
          // ignore error
        }
      },
      invalidatesTags: (result) =>
        result?.user
          ? [
              { type: "User", id: result.user.username.toLowerCase() },
              { type: "User", id: "ME" },
            ]
          : ["User"],
    }),
    login: build.mutation<
      { user: User; accessToken: string },
      { login: string; password: string }
    >({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["User", "MyCommunities"],
    }),
    register: build.mutation<
      { user: User; accessToken: string },
      { username: string; email: string; password: string }
    >({
      query: (data) => ({
        url: "/auth/register",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["User", "MyCommunities"],
    }),
    logout: build.mutation<{ message: string }, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      invalidatesTags: ["User", "MyCommunities"],
    }),
    followUser: build.mutation<
      { isFollowing: boolean; followersCount: number },
      string
    >({
      query: (username) => ({
        url: `/auth/users/${encodeURIComponent(username)}/follow`,
        method: "POST",
      }),
      async onQueryStarted(username, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          usersApiSlice.util.updateQueryData(
            "getUserProfile",
            username,
            (draft) => {
              if (draft?.user) {
                draft.user.isFollowing = true;
                draft.user.followersCount =
                  (draft.user.followersCount || 0) + 1;
              }
            },
          ),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(
            usersApiSlice.util.updateQueryData(
              "getUserProfile",
              username,
              (draft) => {
                if (draft?.user) {
                  draft.user.isFollowing = data.isFollowing;
                  draft.user.followersCount = data.followersCount;
                }
              },
            ),
          );
        } catch {
          patchResult.undo();
        }
      },
    }),
    unfollowUser: build.mutation<
      { isFollowing: boolean; followersCount: number },
      string
    >({
      query: (username) => ({
        url: `/auth/users/${encodeURIComponent(username)}/follow`,
        method: "DELETE",
      }),
      async onQueryStarted(username, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          usersApiSlice.util.updateQueryData(
            "getUserProfile",
            username,
            (draft) => {
              if (draft?.user) {
                draft.user.isFollowing = false;
                draft.user.followersCount = Math.max(
                  0,
                  (draft.user.followersCount || 0) - 1,
                );
              }
            },
          ),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(
            usersApiSlice.util.updateQueryData(
              "getUserProfile",
              username,
              (draft) => {
                if (draft?.user) {
                  draft.user.isFollowing = data.isFollowing;
                  draft.user.followersCount = data.followersCount;
                }
              },
            ),
          );
        } catch {
          patchResult.undo();
        }
      },
    }),
  }),
});

export const {
  useGetMeQuery,
  useLazyGetMeQuery,
  useGetUserProfileQuery,
  useUpdateAvatarMutation,
  useUpdateBannerMutation,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useFollowUserMutation,
  useUnfollowUserMutation,
} = usersApiSlice;
