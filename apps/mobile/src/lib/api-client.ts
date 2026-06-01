import { router } from "expo-router";
import { clearTokens, getStoredTokens, setAccessToken } from "./auth";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface FetchOptions extends RequestInit {
  token?: string;
  /** Internal: set when this request is a retry after a token refresh. */
  _isRetry?: boolean;
  /** Internal: skip the 401 → refresh interceptor (used by /auth/* calls). */
  _skipAuthRetry?: boolean;
}

interface RefreshResponse {
  success: boolean;
  data: { accessToken: string };
}

/** Singleton: one refresh in flight at a time. Resolves with the new access
 *  token on success, or `null` if refresh failed. */
let refreshPromise: Promise<string | null> | null = null;

/** Hook for tests / app shutdown to reset state between cases. */
export function __resetApiClientState() {
  refreshPromise = null;
}

async function performRefresh(): Promise<string | null> {
  const { refreshToken } = await getStoredTokens();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as RefreshResponse;
    const newAccess = json?.data?.accessToken;
    if (!newAccess) return null;
    await setAccessToken(newAccess);
    return newAccess;
  } catch {
    return null;
  }
}

async function getOrStartRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      // Clear the singleton after settle so future 401s start a fresh refresh.
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function handleRefreshFailure(): Promise<void> {
  await clearTokens();
  try {
    router.replace("/(auth)/login");
  } catch {
    // Router may be unavailable in non-app contexts (e.g. tests). Swallow.
  }
}

async function request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers: customHeaders, _isRetry, _skipAuthRetry, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(customHeaders as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, { ...rest, headers });

  // 401 → attempt one transparent refresh + retry. Skip for /auth/* endpoints
  // and for requests that are already a retry.
  if (
    res.status === 401 &&
    !_isRetry &&
    !_skipAuthRetry &&
    !endpoint.startsWith("/auth/")
  ) {
    const newToken = await getOrStartRefresh();
    if (!newToken) {
      await handleRefreshFailure();
      let data: { error?: { message?: string } } = {};
      try {
        data = await res.json();
      } catch {
        // ignore
      }
      throw new Error(data.error?.message || "Unauthorized");
    }

    return request<T>(endpoint, {
      ...options,
      token: newToken,
      _isRetry: true,
    });
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || "Request failed");
  }

  return data;
}

export const api = {
  get: <T>(endpoint: string, options?: FetchOptions) =>
    request<T>(endpoint, { ...options, method: "GET" }),
  post: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    request<T>(endpoint, { ...options, method: "POST", body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    request<T>(endpoint, { ...options, method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    request<T>(endpoint, { ...options, method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(endpoint: string, options?: FetchOptions) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};
