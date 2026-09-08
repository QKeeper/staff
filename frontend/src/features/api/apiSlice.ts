import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import type { ApiResponse } from "@/api/client";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: "/api/v1",
  credentials: "include",
});

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      return Boolean(res.ok && data?.success);
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  const url = typeof args === "string" ? args : args.url;
  if (result.error && result.error.status === 401 && !url.includes("/auth/")) {
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
  tagTypes: ["User", "Post", "Comment", "Community", "MyCommunities"],
  endpoints: () => ({}),
});
