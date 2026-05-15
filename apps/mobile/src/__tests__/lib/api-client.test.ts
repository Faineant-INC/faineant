import { api, __resetApiClientState } from "@/lib/api-client";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  __resetApiClientState();
  // @ts-expect-error test helper from jest.setup.js
  SecureStore.__clear();
});

function mockResponse(data: unknown, ok = true, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    json: () => Promise.resolve(data),
  });
}

describe("api-client", () => {
  const BASE_URL = "http://localhost:3001/api/v1";

  describe("GET requests", () => {
    it("makes a GET request to the correct URL", async () => {
      mockResponse({ data: [] });

      await api.get("/search/providers");

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/search/providers`,
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("includes authorization header when token provided", async () => {
      mockResponse({ data: [] });

      await api.get("/bookings/client", { token: "my-token" });

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/bookings/client`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer my-token",
          }),
        }),
      );
    });

    it("omits authorization header when no token", async () => {
      mockResponse({ data: [] });

      await api.get("/posts");

      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders.Authorization).toBeUndefined();
    });

    it("returns parsed JSON response", async () => {
      const responseData = { data: { items: [{ id: "1" }] } };
      mockResponse(responseData);

      const result = await api.get("/search/providers");

      expect(result).toEqual(responseData);
    });
  });

  describe("POST requests", () => {
    it("sends POST with JSON body", async () => {
      mockResponse({ data: { user: { id: "1" } } });

      await api.post("/auth/login", { email: "test@test.com", password: "pass123" });

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/auth/login`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "test@test.com", password: "pass123" }),
        }),
      );
    });

    it("sets Content-Type to application/json", async () => {
      mockResponse({ data: {} });

      await api.post("/auth/register", { email: "a@b.com" });

      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders["Content-Type"]).toBe("application/json");
    });
  });

  describe("PUT requests", () => {
    it("sends PUT with JSON body", async () => {
      mockResponse({ data: {} });

      await api.put("/profile", { firstName: "Jane" }, { token: "tok" });

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/profile`,
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ firstName: "Jane" }),
        }),
      );
    });
  });

  describe("PATCH requests", () => {
    it("sends PATCH with JSON body", async () => {
      mockResponse({ data: {} });

      await api.patch("/bookings/123/status", { status: "CONFIRMED" }, { token: "tok" });

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/bookings/123/status`,
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "CONFIRMED" }),
        }),
      );
    });
  });

  describe("DELETE requests", () => {
    it("sends DELETE request", async () => {
      mockResponse({ data: {} });

      await api.delete("/services/123", { token: "tok" });

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/services/123`,
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  describe("error handling", () => {
    it("throws an error when response is not ok", async () => {
      mockResponse({ error: { message: "Invalid credentials" } }, false, 401);

      await expect(api.post("/auth/login", {})).rejects.toThrow("Invalid credentials");
    });

    it("throws generic error when no error message in response", async () => {
      mockResponse({}, false, 500);

      await expect(api.get("/fail")).rejects.toThrow("Request failed");
    });
  });

  describe("401 refresh interceptor", () => {
    async function seedTokens(access: string, refresh: string) {
      await SecureStore.setItemAsync("arc_access_token", access);
      await SecureStore.setItemAsync("arc_refresh_token", refresh);
    }

    it("refreshes the access token and retries the original request on 401", async () => {
      await seedTokens("old-access", "refresh-tok");

      // 1) original request → 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: "Token expired" } }),
      });
      // 2) /auth/refresh → 200 with new access
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: { accessToken: "new-access" } }),
      });
      // 3) retry → 200
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { ok: true } }),
      });

      const result = await api.get<{ data: { ok: boolean } }>("/bookings/client", {
        token: "old-access",
      });

      expect(result).toEqual({ data: { ok: true } });
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Refresh call uses /auth/refresh with refresh token
      expect(mockFetch.mock.calls[1][0]).toBe(`${BASE_URL}/auth/refresh`);
      expect(JSON.parse(mockFetch.mock.calls[1][1].body)).toEqual({ refreshToken: "refresh-tok" });

      // Retry uses the new bearer
      expect(mockFetch.mock.calls[2][1].headers.Authorization).toBe("Bearer new-access");

      // SecureStore got the new access token
      const stored = await SecureStore.getItemAsync("arc_access_token");
      expect(stored).toBe("new-access");
    });

    it("clears tokens and redirects to /(auth)/login when refresh fails", async () => {
      await seedTokens("old-access", "bad-refresh");

      // 1) original → 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: "Token expired" } }),
      });
      // 2) /auth/refresh → 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: "Invalid refresh" } }),
      });

      await expect(
        api.get("/bookings/client", { token: "old-access" }),
      ).rejects.toThrow();

      // Tokens cleared
      expect(await SecureStore.getItemAsync("arc_access_token")).toBeNull();
      expect(await SecureStore.getItemAsync("arc_refresh_token")).toBeNull();

      // Redirected to login
      expect(router.replace).toHaveBeenCalledWith("/(auth)/login");

      // Original request was NOT retried (only 2 fetch calls: original + refresh)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("deduplicates concurrent 401s into a single refresh call", async () => {
      await seedTokens("old-access", "refresh-tok");

      // Two concurrent requests both 401
      const original401 = () => ({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: "Token expired" } }),
      });

      // We don't know the exact order in which fetches resolve, but we can
      // queue them up: two 401s, one refresh response, two retry successes.
      let refreshResolve!: (value: unknown) => void;
      const refreshPending = new Promise((resolve) => {
        refreshResolve = resolve;
      });

      mockFetch
        .mockResolvedValueOnce(original401()) // request A → 401
        .mockResolvedValueOnce(original401()) // request B → 401
        .mockReturnValueOnce(refreshPending) // /auth/refresh (pending)
        .mockResolvedValueOnce({
          // retry A
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: "A" }),
        })
        .mockResolvedValueOnce({
          // retry B
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: "B" }),
        });

      const callA = api.get<{ data: string }>("/a", { token: "old-access" });
      const callB = api.get<{ data: string }>("/b", { token: "old-access" });

      // Let initial 401s land
      await new Promise((r) => setImmediate(r));

      // Now resolve the shared refresh
      refreshResolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: { accessToken: "new-access" } }),
      });

      const [resA, resB] = await Promise.all([callA, callB]);
      expect(resA).toEqual({ data: "A" });
      expect(resB).toEqual({ data: "B" });

      // Count refresh calls: only one should target /auth/refresh
      const refreshCalls = mockFetch.mock.calls.filter(
        (c) => c[0] === `${BASE_URL}/auth/refresh`,
      );
      expect(refreshCalls).toHaveLength(1);

      // Both retries used the same new bearer
      const retryCalls = mockFetch.mock.calls.filter(
        (c) => c[1]?.headers?.Authorization === "Bearer new-access",
      );
      expect(retryCalls).toHaveLength(2);
    });

    it("does not intercept 401 on /auth/* endpoints (no refresh loop)", async () => {
      mockResponse({ error: { message: "Invalid credentials" } }, false, 401);

      await expect(
        api.post("/auth/login", { email: "a@b.com", password: "x" }),
      ).rejects.toThrow("Invalid credentials");

      // Only the single login fetch — no refresh attempted
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
