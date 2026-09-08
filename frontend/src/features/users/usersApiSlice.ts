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
      invalidatesTags: ["User", "Post", "Comment"],
    }),
    updateBanner: build.mutation<{ user: User }, { image: string }>({
      query: (body) => ({
        url: "/auth/me/banner",
        method: "PATCH",
        body,
      }),
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
} = usersApiSlice;
