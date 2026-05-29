import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

// next/image is not mocked globally; stub it to a plain <img> for this file.
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) =>
    React.createElement("img", props as Record<string, unknown>),
}));

import { SiteHeader } from "@/components/layout/site-header";

describe("SiteHeader — launch flag", () => {
  const original = process.env.NEXT_PUBLIC_LAUNCH_MODE;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_LAUNCH_MODE;
    else process.env.NEXT_PUBLIC_LAUNCH_MODE = original;
  });

  it("pre-launch: hides Practitioners, keeps Services + Sign in, button reads 'Join the list'", () => {
    process.env.NEXT_PUBLIC_LAUNCH_MODE = "false";
    render(<SiteHeader />);
    expect(screen.queryByText("Practitioners")).toBeNull();
    expect(screen.getByText("Services")).toBeInTheDocument();
    expect(screen.getByText("Sign in")).toBeInTheDocument();
    expect(screen.getByText("Join the list")).toBeInTheDocument();
    expect(screen.queryByText("Reserve")).toBeNull();
  });

  it("launched: shows Practitioners and the 'Reserve' button", () => {
    process.env.NEXT_PUBLIC_LAUNCH_MODE = "true";
    render(<SiteHeader />);
    expect(screen.getByText("Practitioners")).toBeInTheDocument();
    expect(screen.getByText("Reserve")).toBeInTheDocument();
    expect(screen.queryByText("Join the list")).toBeNull();
  });
});
