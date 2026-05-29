import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) =>
    React.createElement("img", props as Record<string, unknown>),
}));
// Keep the test focused on the page's own conditional link.
vi.mock("@/components/login-form", () => ({
  LoginForm: () => React.createElement("div", { "data-testid": "login-form" }),
}));

import LoginPage from "@/app/login/page";

describe("LoginPage — sign-up link", () => {
  const original = process.env.NEXT_PUBLIC_LAUNCH_MODE;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_LAUNCH_MODE;
    else process.env.NEXT_PUBLIC_LAUNCH_MODE = original;
  });

  it("pre-launch: links to the waitlist, not /register", () => {
    process.env.NEXT_PUBLIC_LAUNCH_MODE = "false";
    render(<LoginPage />);
    const link = screen.getByText("Join the waitlist →");
    expect(link).toHaveAttribute("href", "/#waitlist");
    expect(screen.queryByText("Open an account →")).toBeNull();
  });

  it("launched: links to /register", () => {
    process.env.NEXT_PUBLIC_LAUNCH_MODE = "true";
    render(<LoginPage />);
    const link = screen.getByText("Open an account →");
    expect(link).toHaveAttribute("href", "/register");
  });
});
