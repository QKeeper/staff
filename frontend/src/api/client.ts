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
  email: string;
  globalRole: "USER" | "ADMIN";
  avatarUrl?: string | null;
  bio?: string | null;
  createdAt: string;
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
    create: (data: {
      name: string;
      displayName?: string;
      description: string;
      topic: string;
      isPrivate?: boolean;
      rulesAgreement: boolean;
    }) =>
      apiFetch<Community>("/api/v1/communities", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getByName: (name: string) =>
      apiFetch<Community>(`/api/v1/communities/${name}`, {
        method: "GET",
      }),
    getMyCommunities: () =>
      apiFetch<MyCommunity[]>("/api/v1/communities/my", {
        method: "GET",
      }),
    list: (params?: {
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
      return apiFetch<Community[]>(`/api/v1/communities${qs ? `?${qs}` : ""}`, {
        method: "GET",
      });
    },
  },
};
