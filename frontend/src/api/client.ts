export interface ApiErrorDetail {
  field?: string;
  message: string;
  rule?: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorPayload;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: unknown;
  };
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly details?: ApiErrorDetail[];
  public readonly statusCode: number;

  constructor(
    message: string,
    code = "UNKNOWN_ERROR",
    statusCode = 500,
    details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

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

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = endpoint.startsWith("/") ? endpoint : `/api/v1/${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // send/receive httpOnly cookies
  });

  // Automatically refresh access token on 401 if it wasn't an auth endpoint
  if (response.status === 401 && !endpoint.includes("/auth/")) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      response = await fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });
    }
  }

  let json: ApiResponse<T>;
  try {
    json = await response.json();
  } catch {
    throw new ApiError(
      response.statusText || "Network response error",
      "NETWORK_ERROR",
      response.status,
    );
  }

  if (!json.success || !response.ok) {
    const err = json.error;
    throw new ApiError(
      err?.message || "An unexpected error occurred",
      err?.code || "UNKNOWN_ERROR",
      response.status,
      err?.details,
    );
  }

  return json.data as T;
}

export interface User {
  id: string;
  username: string;
  displayName?: string | null;
  email: string;
  globalRole: "USER" | "ADMIN";
  avatarUrl?: string | null;
  bio?: string | null;
  createdAt: string;
  _count?: {
    createdCommunities?: number;
    memberships?: number;
    posts?: number;
    comments?: number;
  };
}

export interface UserProfile {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  createdAt: string;
  _count: {
    posts: number;
    comments: number;
  };
}

export interface Community {
  id: string;
  name: string;
  displayName?: string | null;
  description: string;
  topic: string;
  isPrivate: boolean;
  createdAt: string;
  membersCount: number;
  currentUserMembership?: {
    role: "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER";
    permissions: string[];
    joinedAt?: string;
  } | null;
}

export interface MyCommunity {
  id: string;
  name: string;
  displayName?: string | null;
  description: string;
  topic: string;
  role: "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER";
  permissions: string[];
  membersCount: number;
  joinedAt: string;
}

const communityCache = new Map<string, Community>();

let cachedMyCommunities: MyCommunity[] | null = null;

export const myCommunitiesCacheUtils = {
  get: (): MyCommunity[] | null => cachedMyCommunities,
  set: (communities: MyCommunity[]): void => {
    cachedMyCommunities = communities;
  },
  clear: (): void => {
    cachedMyCommunities = null;
  },
};

export const communityCacheUtils = {
  get: (nameOrId: string): Community | undefined => {
    return (
      communityCache.get(nameOrId.toLowerCase()) || communityCache.get(nameOrId)
    );
  },
  set: (community: Community): void => {
    communityCache.set(community.name.toLowerCase(), community);
    communityCache.set(community.id, community);
  },
  clear: (): void => {
    communityCache.clear();
  },
};

export const api = {
  auth: {
    register: (data: { username: string; email: string; password: string }) =>
      apiFetch<{ user: User; accessToken: string }>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    login: (data: { login: string; password: string }) =>
      apiFetch<{ user: User; accessToken: string }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    logout: () =>
      apiFetch<{ message: string }>("/api/v1/auth/logout", {
        method: "POST",
      }),
    me: () =>
      apiFetch<{ user: User }>("/api/v1/auth/me", {
        method: "GET",
      }),
  },
  communities: {
    create: async (data: {
      name: string;
      displayName?: string;
      description: string;
      topic: string;
      isPrivate?: boolean;
      rulesAgreement: boolean;
    }) => {
      const comm = await apiFetch<Community>("/api/v1/communities", {
        method: "POST",
        body: JSON.stringify(data),
      });
      communityCacheUtils.set(comm);
      return comm;
    },
    getByName: async (name: string, bypassCache = false) => {
      if (!bypassCache) {
        const cached = communityCacheUtils.get(name);
        if (cached) return cached;
      }
      const comm = await apiFetch<Community>(`/api/v1/communities/${name}`, {
        method: "GET",
      });
      communityCacheUtils.set(comm);
      return comm;
    },
    getMyCommunities: async (bypassCache = false) => {
      if (!bypassCache && cachedMyCommunities !== null) {
        return cachedMyCommunities;
      }
      const list = await apiFetch<MyCommunity[]>("/api/v1/communities/my", {
        method: "GET",
      });
      myCommunitiesCacheUtils.set(list);
      return list;
    },
    list: async (params?: {
      page?: number;
      limit?: number;
      topic?: string;
      search?: string;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", String(params.page));
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.topic) searchParams.set("topic", params.topic);
      if (params?.search) searchParams.set("search", params.search);

      const qs = searchParams.toString();
      const list = await apiFetch<Community[]>(
        `/api/v1/communities${qs ? `?${qs}` : ""}`,
        {
          method: "GET",
        },
      );
      list.forEach((comm) => communityCacheUtils.set(comm));
      return list;
    },
  },
  users: {
    getByUsername: async (username: string) => {
      return apiFetch<{ user: UserProfile }>(
        `/api/v1/auth/users/${encodeURIComponent(username)}`,
        {
          method: "GET",
        },
      );
    },
  },
  posts: {
    list: async (params?: {
      communityName?: string;
      communityId?: string;
      authorUsername?: string;
      authorId?: string;
      sort?: "best" | "top" | "new";
      page?: number;
      limit?: number;
    }) => {
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
      return apiFetch<Post[]>(`/api/v1/posts${qs ? `?${qs}` : ""}`, {
        method: "GET",
      });
    },
    getById: async (id: string) => {
      return apiFetch<Post>(`/api/v1/posts/${id}`, {
        method: "GET",
      });
    },
    create: async (data: {
      title: string;
      content?: string;
      mediaUrl?: string;
      communityId?: string;
      communityName?: string;
    }) => {
      return apiFetch<Post>("/api/v1/posts", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    vote: async (id: string, value: number) => {
      return apiFetch<{
        postId: string;
        upvotes: number;
        downvotes: number;
        score: number;
        userVote: number;
      }>(`/api/v1/posts/${id}/vote`, {
        method: "POST",
        body: JSON.stringify({ value }),
      });
    },
    listComments: async (postId: string) => {
      return apiFetch<Comment[]>(`/api/v1/posts/${postId}/comments`, {
        method: "GET",
      });
    },
    listUserComments: async (username: string) => {
      return apiFetch<UserComment[]>(
        `/api/v1/posts/user/${encodeURIComponent(username)}/comments`,
        {
          method: "GET",
        },
      );
    },
    voteComment: async (id: string, value: number) => {
      return apiFetch<{
        commentId: string;
        upvotes: number;
        downvotes: number;
        score: number;
        userVote: number;
      }>(`/api/v1/posts/comments/${id}/vote`, {
        method: "POST",
        body: JSON.stringify({ value }),
      });
    },
    createComment: async (
      postId: string,
      content: string,
      parentId?: string | null,
    ) => {
      return apiFetch<Comment>(`/api/v1/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content, parentId }),
      });
    },
  },
};

export interface PostAuthor {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl: string | null;
}

export interface PostCommunity {
  id: string;
  name: string;
  displayName: string | null;
}

export interface Post {
  id: string;
  title: string;
  content: string | null;
  mediaUrl: string | null;
  authorId: string;
  communityId: string | null;
  upvotes: number;
  downvotes: number;
  score: number;
  userVote?: number;
  commentsCount?: number;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
  community?: PostCommunity | null;
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  postId: string;
  parentId?: string | null;
  upvotes: number;
  downvotes: number;
  score: number;
  userVote?: number;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
}

export interface UserComment {
  id: string;
  content: string;
  authorId: string;
  postId: string;
  parentId?: string | null;
  upvotes: number;
  downvotes: number;
  score: number;
  userVote?: number;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
  post: {
    id: string;
    title: string;
    community?: {
      name: string;
      displayName?: string | null;
    } | null;
  };
}
