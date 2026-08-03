import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as dataClient from "@/lib/data-client";
import LoginScreen from "@/app/(auth)/login";

jest.mock("@/lib/data-client");

const mockRouter = { replace: jest.fn(), push: jest.fn(), back: jest.fn() };
(useRouter as jest.Mock).mockReturnValue(mockRouter);

beforeEach(() => {
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
});

function submit(email = "user@test.com", password = "password123") {
  const view = render(<LoginScreen />);
  fireEvent.changeText(view.getByPlaceholderText("you@somewhere.com"), email);
  fireEvent.changeText(view.getByPlaceholderText("••••••••"), password);
  fireEvent.press(view.getByText("SIGN IN →"));
  return view;
}

describe("LoginScreen", () => {
  it("renders and updates the sign-in fields", () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    expect(getByText("SIGN IN")).toBeTruthy();
    expect(getByText("the door.")).toBeTruthy();
    fireEvent.changeText(getByPlaceholderText("you@somewhere.com"), "user@test.com");
    fireEvent.changeText(getByPlaceholderText("••••••••"), "password123");
    expect(getByPlaceholderText("you@somewhere.com").props.value).toBe("user@test.com");
    expect(getByPlaceholderText("••••••••").props.value).toBe("password123");
  });

  it("signs in directly with Supabase", async () => {
    (dataClient.signIn as jest.Mock).mockResolvedValue({
      id: "1",
      email: "user@test.com",
      firstName: "John",
      lastName: "Doe",
      role: "CLIENT",
    });

    submit();

    await waitFor(() => {
      expect(dataClient.signIn).toHaveBeenCalledWith(
        "user@test.com",
        "password123",
      );
    });
  });

  it.each([
    ["CLIENT", "/(client)/home"],
    ["PROVIDER", "/(provider)/home"],
  ])("routes a %s to the correct home", async (role, route) => {
    (dataClient.signIn as jest.Mock).mockResolvedValue({
      id: "1",
      email: "user@test.com",
      firstName: "John",
      lastName: "Doe",
      role,
    });

    submit();

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(route));
  });

  it("shows a loading state while Supabase is signing in", async () => {
    let resolveSignIn!: (value: unknown) => void;
    (dataClient.signIn as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      }),
    );

    const view = submit();
    expect(view.getByText("WAIT…")).toBeTruthy();

    resolveSignIn({ id: "1", email: "a@b.com", role: "CLIENT" });
    await waitFor(() => expect(view.getByText("SIGN IN →")).toBeTruthy());
  });

  it("shows an inline error on authentication failure", async () => {
    (dataClient.signIn as jest.Mock).mockRejectedValue(new Error("Invalid login"));

    const view = submit();

    await waitFor(() => {
      expect(
        view.getByText("PASSWORD INCORRECT. NOTHING ELSE HAPPENED."),
      ).toBeTruthy();
    });
  });

  it("shows the email-confirmation handoff after sign-up", () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ registered: "true" });

    const { getByText } = render(<LoginScreen />);

    expect(
      getByText("CHECK YOUR EMAIL TO CONFIRM THE ACCOUNT, THEN SIGN IN."),
    ).toBeTruthy();
  });
});
