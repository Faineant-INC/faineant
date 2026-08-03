import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

const { redirectMock } = vi.hoisted(() => ({ redirectMock: vi.fn() }));

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ priority: _priority, fill: _fill, ...props }: Record<string, unknown>) =>
    React.createElement("img", props as Record<string, unknown>),
}));
vi.mock("@/components/register-form", () => ({
  RegisterForm: () => React.createElement("div", { "data-testid": "register-form" }),
}));
// Override the global next/navigation mock to capture redirect().
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/register",
  useSearchParams: () => new URLSearchParams(),
}));

import RegisterPage from "@/app/register/page";

describe("RegisterPage — launch flag", () => {
  const original = process.env.NEXT_PUBLIC_LAUNCH_MODE;
  beforeEach(() => redirectMock.mockReset());
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_LAUNCH_MODE;
    else process.env.NEXT_PUBLIC_LAUNCH_MODE = original;
  });

  it("pre-launch: redirects to /#waitlist", () => {
    process.env.NEXT_PUBLIC_LAUNCH_MODE = "false";
    render(<RegisterPage />);
    expect(redirectMock).toHaveBeenCalledWith("/#waitlist");
  });

  it("launched: renders the register form, no redirect", () => {
    process.env.NEXT_PUBLIC_LAUNCH_MODE = "true";
    render(<RegisterPage />);
    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("register-form")).toBeInTheDocument();
  });
});
