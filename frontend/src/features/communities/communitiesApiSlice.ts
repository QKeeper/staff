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
  }),
});

export const {
  useGetMyCommunitiesQuery,
  useGetCommunityByNameQuery,
  useListCommunitiesQuery,
  useCreateCommunityMutation,
} = communitiesApiSlice;
