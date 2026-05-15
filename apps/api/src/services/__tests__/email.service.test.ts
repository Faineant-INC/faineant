import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { emailVerificationEmail } from "../email-templates";

describe("email service", () => {
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
  const ORIGINAL_KEY = process.env.RESEND_API_KEY;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
    if (ORIGINAL_KEY === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = ORIGINAL_KEY;
  });

  it("no-ops (no provider call) when NODE_ENV=test", async () => {
    process.env.NODE_ENV = "test";
    process.env.RESEND_API_KEY = "re_fake_for_test";
    const { sendEmail, __resetEmailClientForTests } = await import("../email");
    __resetEmailClientForTests();

    const rendered = emailVerificationEmail({
      firstName: "Maeve",
      verifyUrl: "https://faineant.co/verify-email?token=abc",
      expiresInHours: 24,
    });

    const result = await sendEmail(rendered, "maeve@example.com");
    expect(result.delivered).toBe(false);
  });

  it("no-ops when RESEND_API_KEY is absent", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.RESEND_API_KEY;
    const { sendEmail, __resetEmailClientForTests } = await import("../email");
    __resetEmailClientForTests();

    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const rendered = emailVerificationEmail({
      firstName: "Maeve",
      verifyUrl: "https://faineant.co/verify-email?token=abc",
      expiresInHours: 24,
    });

    const result = await sendEmail(rendered, "maeve@example.com");
    expect(result.delivered).toBe(false);
    expect(infoSpy).toHaveBeenCalled();
    infoSpy.mockRestore();
  });

  it("renders the verification template with the brand voice", () => {
    const rendered = emailVerificationEmail({
      firstName: "Maeve",
      verifyUrl: "https://faineant.co/verify-email?token=abc",
      expiresInHours: 24,
    });
    expect(rendered.subject).toContain("Confirm");
    expect(rendered.html).toContain("Confirm address");
    expect(rendered.html).toContain("token=abc");
    expect(rendered.text).toContain("Maeve");
  });
});
