import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import * as auth from "@/lib/auth";
import SplashScreen from "@/app/index";

jest.mock("@/lib/auth");

const mockRouter = { replace: jest.fn(), push: jest.fn(), back: jest.fn() };
(useRouter as jest.Mock).mockReturnValue(mockRouter);

beforeEach(() => {
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
});

describe("SplashScreen", () => {
  it("renders FAINEANT wordmark and tagline", () => {
    (auth.getStoredTokens as jest.Mock).mockReturnValue(new Promise(() => {}));

    const { getByLabelText, getByText } = render(<SplashScreen />);
    expect(getByLabelText("FAINEANT")).toBeTruthy();
    expect(getByText("House calls for the slow-living.")).toBeTruthy();
  });

  it("redirects to login when no stored tokens", async () => {
    (auth.getStoredTokens as jest.Mock).mockResolvedValue({
      accessToken: null,
      user: null,
    });

    render(<SplashScreen />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/(auth)/login");
    });
  });

  it("redirects to provider home when user is PROVIDER", async () => {
    (auth.getStoredTokens as jest.Mock).mockResolvedValue({
      accessToken: "token-123",
      user: { id: "1", role: "PROVIDER", firstName: "A", lastName: "B", email: "a@b.com" },
    });

    render(<SplashScreen />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/(provider)/home");
    });
  });

  it("redirects to client home when user is CLIENT", async () => {
    (auth.getStoredTokens as jest.Mock).mockResolvedValue({
      accessToken: "token-123",
      user: { id: "1", role: "CLIENT", firstName: "A", lastName: "B", email: "a@b.com" },
    });

    render(<SplashScreen />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/(client)/home");
    });
  });

  it("clears unsupported admin sessions and redirects to login", async () => {
    (auth.getStoredTokens as jest.Mock).mockResolvedValue({
      accessToken: "token-123",
      user: { id: "1", role: "ADMIN", firstName: "A", lastName: "B", email: "a@b.com" },
    });
    (auth.clearTokens as jest.Mock).mockResolvedValue(undefined);

    render(<SplashScreen />);

    await waitFor(() => {
      expect(auth.clearTokens).toHaveBeenCalledWith();
      expect(mockRouter.replace).toHaveBeenCalledWith("/(auth)/login");
    });
  });
});
