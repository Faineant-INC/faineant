import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ functions: { invoke: mocks.invoke } }),
}));

import { UnsubscribeForm } from "@/app/unsubscribe/unsubscribe-form";

describe("UnsubscribeForm", () => {
  beforeEach(() => mocks.invoke.mockReset());

  it("withdraws only marketing consent through the public function", async () => {
    mocks.invoke.mockResolvedValue({
      data: { unsubscribed: true },
      error: null,
    });
    render(<UnsubscribeForm token="signed-token" />);
    fireEvent.click(screen.getByRole("button", { name: "Stop marketing emails" }));

    await waitFor(() => {
      expect(mocks.invoke).toHaveBeenCalledWith("marketing-subscribe", {
        body: { action: "unsubscribe", token: "signed-token" },
      });
    });
    expect(await screen.findByRole("status")).toHaveTextContent(/marketing email has stopped/i);
  });

  it("fails closed when the link has no token", () => {
    render(<UnsubscribeForm token="" />);
    expect(screen.getByRole("button", { name: "Stop marketing emails" })).toBeDisabled();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});
