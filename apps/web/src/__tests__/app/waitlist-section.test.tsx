import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MARKETING_CONSENT_VERSION } from "@faineant/shared";

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ functions: { invoke: mocks.invoke } }),
}));

import { WaitlistSection } from "@/app/_components/waitlist-section";

describe("WaitlistSection marketing consent", () => {
  beforeEach(() => mocks.invoke.mockReset());

  it("requires an affirmative marketing-email choice", async () => {
    render(<WaitlistSection />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "person@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reserve a place" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /choose the email marketing consent box/i,
    );
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("submits the disclosure version and renders delivery confirmation", async () => {
    mocks.invoke.mockResolvedValue({
      data: { subscribed: true },
      error: null,
    });
    render(<WaitlistSection />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "PERSON@EXAMPLE.COM" },
    });
    fireEvent.click(
      screen.getByRole("checkbox", { name: /receive marketing emails from Faineant/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Reserve a place" }));

    await waitFor(() => {
      expect(mocks.invoke).toHaveBeenCalledWith("marketing-subscribe", {
        body: expect.objectContaining({
          email: "person@example.com",
          marketingConsent: true,
          consentVersion: MARKETING_CONSENT_VERSION,
        }),
      });
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      /if it is new to the list, a welcome note is on its way/i,
    );
  });

  it("links the consent disclosure to privacy and email terms", () => {
    render(<WaitlistSection />);
    expect(screen.getByRole("link", { name: "Privacy Notice" })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(screen.getByRole("link", { name: "Email Terms" })).toHaveAttribute(
      "href",
      "/marketing-terms",
    );
  });

  it("tells the visitor when consent saved but welcome delivery failed", async () => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: {
        context: new Response(
          JSON.stringify({
            subscribed: true,
            emailSent: false,
            error: "Your address was saved, but the welcome note could not be sent. Try again.",
          }),
          { status: 503, headers: { "content-type": "application/json" } },
        ),
      },
    });
    render(<WaitlistSection />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "person@example.com" },
    });
    fireEvent.click(
      screen.getByRole("checkbox", { name: /receive marketing emails from Faineant/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Reserve a place" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /address was saved, but the welcome note could not be sent/i,
    );
  });

  it("does not expose database errors to a visitor", async () => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: {
        context: new Response(
          JSON.stringify({ error: "permission denied for table waitlist_entries" }),
          { status: 500, headers: { "content-type": "application/json" } },
        ),
      },
    });
    render(<WaitlistSection />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "person@example.com" },
    });
    fireEvent.click(
      screen.getByRole("checkbox", { name: /receive marketing emails from Faineant/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Reserve a place" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("We could not save your place. Try again.");
    expect(alert).not.toHaveTextContent(/waitlist_entries|permission denied/i);
  });
});
