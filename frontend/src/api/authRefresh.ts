let refreshPromise: Promise<boolean> | null = null;

/**
 * Checks if the given endpoint should bypass token refreshing when receiving 401.
 * Only authentication initiation/termination endpoints should bypass refresh
 * to prevent infinite loops and false refresh attempts on invalid login credentials.
 */
export function shouldBypassRefresh(endpoint: string): boolean {
  if (!endpoint) return false;
  const cleanEndpoint = endpoint.split("?")[0];

  const bypassRoutes = [
    "/auth/login",
    "/auth/register",
    "/auth/refresh",
    "/auth/logout",
  ];

  return bypassRoutes.some((route) => cleanEndpoint.includes(route));
}

/**
 * Single shared token refresh logic across the entire application (RTK Query, apiFetch, WebSockets).
 * Guarantees that concurrent 401 errors await the same single refresh HTTP request.
 */
export async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        return false;
      }

      const data = await res.json();
      return Boolean(data?.success);
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
