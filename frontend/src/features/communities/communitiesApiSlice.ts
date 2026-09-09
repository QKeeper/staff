import { apiSlice } from "../api/apiSlice";
import type { Community, MyCommunity } from "@/api/client";

export interface ListCommunitiesParams {
  page?: number;
  limit?: number;
  topic?: string;
  search?: string;
}

export const communitiesApiSlice = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getMyCommunities: build.query<MyCommunity[], void>({
      query: () => "/communities/my",
      providesTags: ["MyCommunities"],
    }),
    getCommunityByName: build.query<Community, string>({
      query: (name) => `/communities/${encodeURIComponent(name)}`,
      providesTags: (_result, _error, name) => [
        { type: "Community", id: name.toLowerCase() },
      ],
    }),
    listCommunities: build.query<Community[], ListCommunitiesParams | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.page) searchParams.set("page", String(params.page));
        if (params?.limit) searchParams.set("limit", String(params.limit));
        if (params?.topic) searchParams.set("topic", params.topic);
        if (params?.search) searchParams.set("search", params.search);
        const qs = searchParams.toString();
        return `/communities${qs ? `?${qs}` : ""}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ name }) => ({
                type: "Community" as const,
                id: name.toLowerCase(),
              })),
              { type: "Community", id: "LIST" },
            ]
          : [{ type: "Community", id: "LIST" }],
    }),
    createCommunity: build.mutation<
      Community,
      {
        name: string;
        displayName?: string;
        description: string;
        topic: string;
        isPrivate?: boolean;
        rulesAgreement: boolean;
      }
    >({
      query: (data) => ({
        url: "/communities",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Community", "MyCommunities"],
    }),
    followCommunity: build.mutation<{ isFollowing: boolean }, string>({
      query: (name) => ({
        url: `/communities/${encodeURIComponent(name)}/follow`,
        method: "POST",
      }),
      async onQueryStarted(name, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          communitiesApiSlice.util.updateQueryData(
            "getCommunityByName",
            name,
            (draft) => {
              if (draft) {
                draft.isFollowing = true;
              }
            },
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
    unfollowCommunity: build.mutation<{ isFollowing: boolean }, string>({
      query: (name) => ({
        url: `/communities/${encodeURIComponent(name)}/follow`,
        method: "DELETE",
      }),
      async onQueryStarted(name, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          communitiesApiSlice.util.updateQueryData(
            "getCommunityByName",
            name,
            (draft) => {
              if (draft) {
                draft.isFollowing = false;
              }
            },
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
    updateCommunityAvatar: build.mutation<
      { community: Community },
      { name: string; image: string }
    >({
      query: ({ name, image }) => ({
        url: `/communities/${encodeURIComponent(name)}/avatar`,
        method: "PATCH",
        body: { image },
      }),
      async onQueryStarted({ name, image }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          communitiesApiSlice.util.updateQueryData(
            "getCommunityByName",
            name,
            (draft) => {
              if (draft) {
                draft.avatarUrl = image;
              }
            },
          ),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(
            communitiesApiSlice.util.updateQueryData(
              "getCommunityByName",
              name,
              (draft) => {
                if (draft) {
                  draft.avatarUrl = data.community.avatarUrl;
                }
              },
            ),
          );
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: (_result, _error, { name }) => [
        { type: "Community", id: name.toLowerCase() },
        "MyCommunities",
        { type: "Community", id: "LIST" },
      ],
    }),
    updateCommunityBanner: build.mutation<
      { community: Community },
      { name: string; image: string }
    >({
      query: ({ name, image }) => ({
        url: `/communities/${encodeURIComponent(name)}/banner`,
        method: "PATCH",
        body: { image },
      }),
      async onQueryStarted({ name, image }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          communitiesApiSlice.util.updateQueryData(
            "getCommunityByName",
            name,
            (draft) => {
              if (draft) {
                draft.bannerUrl = image;
              }
            },
          ),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(
            communitiesApiSlice.util.updateQueryData(
              "getCommunityByName",
              name,
              (draft) => {
                if (draft) {
                  draft.bannerUrl = data.community.bannerUrl;
                }
              },
            ),
          );
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: (_result, _error, { name }) => [
        { type: "Community", id: name.toLowerCase() },
        "MyCommunities",
        { type: "Community", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetMyCommunitiesQuery,
  useGetCommunityByNameQuery,
  useListCommunitiesQuery,
  useCreateCommunityMutation,
  useFollowCommunityMutation,
  useUnfollowCommunityMutation,
  useUpdateCommunityAvatarMutation,
  useUpdateCommunityBannerMutation,
} = communitiesApiSlice;
