import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import * as dataClient from "@/lib/data-client";
import RegisterScreen from "@/app/(auth)/register";

jest.mock("@/lib/data-client");

const mockRouter = { replace: jest.fn(), push: jest.fn(), back: jest.fn() };
(useRouter as jest.Mock).mockReturnValue(mockRouter);

beforeEach(() => {
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue(mockRouter);
});

function submit(role: "CLIENT" | "PROVIDER" = "CLIENT") {
  const view = render(<RegisterScreen />);
  if (role === "PROVIDER") fireEvent.press(view.getByText("PROFESSIONAL"));
  fireEvent.changeText(view.getByPlaceholderText("Maeve"), "Jane");
  fireEvent.changeText(view.getByPlaceholderText("Lévesque"), "Smith");
  fireEvent.changeText(
    view.getByPlaceholderText("you@somewhere.com"),
    "jane@test.com",
  );
  fireEvent.changeText(
    view.getByPlaceholderText("EIGHT CHARACTERS, MINIMUM"),
    "secret123",
  );
  fireEvent.press(view.getByText("OPEN AN ACCOUNT →"));
  return view;
}

describe("RegisterScreen", () => {
  it("renders and updates the registration fields", () => {
    const view = render(<RegisterScreen />);

    expect(view.getByText("CREATE AN ACCOUNT")).toBeTruthy();
    expect(view.getByText("CLIENT")).toBeTruthy();
    expect(view.getByText("PROFESSIONAL")).toBeTruthy();
    fireEvent.changeText(view.getByPlaceholderText("Maeve"), "Jane");
    expect(view.getByPlaceholderText("Maeve").props.value).toBe("Jane");
  });

  it.each(["CLIENT", "PROVIDER"] as const)(
    "registers a %s directly with Supabase",
    async (role) => {
      (dataClient.signUp as jest.Mock).mockResolvedValue({
        user: {
          id: "1",
          email: "jane@test.com",
          firstName: "Jane",
          lastName: "Smith",
          role,
        },
        hasSession: true,
      });

      submit(role);

      await waitFor(() => {
        expect(dataClient.signUp).toHaveBeenCalledWith({
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@test.com",
          password: "secret123",
          role,
        });
      });
    },
  );

  it.each([
    ["CLIENT", "/(client)/home"],
    ["PROVIDER", "/(provider)/home"],
  ] as const)("routes a signed-in %s to the correct home", async (role, route) => {
    (dataClient.signUp as jest.Mock).mockResolvedValue({
      user: { id: "1", email: "jane@test.com", role },
      hasSession: true,
    });

    submit(role);

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(route));
  });

  it("routes to confirmation when Supabase does not return a session", async () => {
    (dataClient.signUp as jest.Mock).mockResolvedValue({
      user: { id: "1", email: "jane@test.com", role: "CLIENT" },
      hasSession: false,
    });

    submit();

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith({
        pathname: "/(auth)/login",
        params: { registered: "true" },
      });
    });
  });

  it("shows loading state during registration", async () => {
    let resolveSignUp!: (value: unknown) => void;
    (dataClient.signUp as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveSignUp = resolve;
      }),
    );

    const view = submit();
    expect(view.getByText("WAIT…")).toBeTruthy();

    resolveSignUp({
      user: { id: "1", email: "jane@test.com", role: "CLIENT" },
      hasSession: true,
    });
    await waitFor(() => expect(view.getByText("OPEN AN ACCOUNT →")).toBeTruthy());
  });

  it("shows the Supabase error inline", async () => {
    (dataClient.signUp as jest.Mock).mockRejectedValue(
      new Error("Email already exists"),
    );

    const view = submit();

    await waitFor(() => expect(view.getByText("EMAIL ALREADY EXISTS")).toBeTruthy());
  });
});
