import { supabase } from "@/lib/supabase";
import {
  clearTokens,
  getStoredTokens,
} from "@/lib/auth";

const mockGetSession = jest.spyOn(supabase.auth, "getSession");
const mockSignOut = jest.spyOn(supabase.auth, "signOut");
const mockMaybeSingle = jest.fn();
const mockEq = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest
  .spyOn(supabase, "from")
  .mockReturnValue({ select: mockSelect } as never);

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  mockSignOut.mockResolvedValue({ error: null });
  mockMaybeSingle.mockResolvedValue({
    data: {
      first_name: "John",
      last_name: "Doe",
      role: "PROVIDER",
      is_active: true,
    },
    error: null,
  });
});

describe("Supabase auth session compatibility", () => {
  it("returns the current Supabase session and mapped user", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "access-token",
          refresh_token: "refresh-token",
          user: {
            id: "user-1",
            email: "test@example.com",
            user_metadata: {
              first_name: "Untrusted",
              last_name: "Metadata",
              role: "ADMIN",
            },
          },
        },
      },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);

    await expect(getStoredTokens()).resolves.toEqual({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: {
        id: "user-1",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "PROVIDER",
      },
    });
    expect(mockFrom).toHaveBeenCalledWith("profiles");
    expect(mockSelect).toHaveBeenCalledWith(
      "first_name,last_name,role,is_active",
    );
    expect(mockEq).toHaveBeenCalledWith("id", "user-1");
  });

  it("returns null values when there is no current session", async () => {
    await expect(getStoredTokens()).resolves.toEqual({
      accessToken: null,
      refreshToken: null,
      user: null,
    });
  });

  it("signs out only the local Supabase session", async () => {
    await clearTokens();

    expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("fails closed and clears a session without an active database profile", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "access-token",
          refresh_token: "refresh-token",
          user: { id: "user-1", email: "disabled@example.com" },
        },
      },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);
    mockMaybeSingle.mockResolvedValue({
      data: {
        first_name: "Disabled",
        last_name: "User",
        role: "CLIENT",
        is_active: false,
      },
      error: null,
    });

    await expect(getStoredTokens()).resolves.toEqual({
      accessToken: null,
      refreshToken: null,
      user: null,
    });
    expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
