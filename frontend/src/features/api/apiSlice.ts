import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import type { ApiResponse } from "@/api/client";
import { tryRefreshToken, shouldBypassRefresh } from "@/api/authRefresh";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: "/api/v1",
  credentials: "include",
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  const url = typeof args === "string" ? args : args.url;
  if (
    result.error &&
    result.error.status === 401 &&
    !shouldBypassRefresh(url)
  ) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }

  if (result.data) {
    const apiResponse = result.data as ApiResponse<unknown>;
    if (
      apiResponse &&
      typeof apiResponse === "object" &&
      "data" in apiResponse
    ) {
      return { data: apiResponse.data, meta: apiResponse.meta };
    }
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "User",
    "Post",
    "Comment",
    "Community",
    "MyCommunities",
    "Notification",
  ],
  endpoints: () => ({}),
});
