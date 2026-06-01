import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { emailVerificationEmail } from "../email-templates";

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

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
      verifyUrl: "https://faineantapp.com/verify-email?token=abc",
      expiresInHours: 24,
    });

    const result = await sendEmail(rendered, "maeve@example.com");
    expect(result.delivered).toBe(false);
  });

  it("no-ops when RESEND_API_KEY is absent", async () => {
    process.env.NODE_ENV = "development";
    // Empty string = "not configured" (see .env.example). Using "" rather than
    // `delete` keeps the test hermetic: dotenv.config() re-runs on module
    // re-import and would otherwise re-inject a real key from a local .env.
    process.env.RESEND_API_KEY = "";
    const { sendEmail, __resetEmailClientForTests } = await import("../email");
    __resetEmailClientForTests();

    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const rendered = emailVerificationEmail({
      firstName: "Maeve",
      verifyUrl: "https://faineantapp.com/verify-email?token=abc",
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
      verifyUrl: "https://faineantapp.com/verify-email?token=abc",
      expiresInHours: 24,
    });
    expect(rendered.subject).toContain("Confirm");
    expect(rendered.html).toContain("Confirm address");
    expect(rendered.html).toContain("token=abc");
    expect(rendered.text).toContain("Maeve");
  });
});

describe("email transport delivery", () => {
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
  const ORIGINAL_KEY = process.env.RESEND_API_KEY;

  const rendered = emailVerificationEmail({
    firstName: "Maeve",
    verifyUrl: "https://faineantapp.com/verify-email?token=abc",
    expiresInHours: 24,
  });

  async function loadSendEmail() {
    process.env.NODE_ENV = "development";
    process.env.RESEND_API_KEY = "re_fake_for_test";
    const mod = await import("../email");
    mod.__resetEmailClientForTests();
    return mod.sendEmail;
  }

  beforeEach(() => {
    vi.resetModules();
    mockSend.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
    if (ORIGINAL_KEY === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = ORIGINAL_KEY;
  });

  it("calls the provider and returns the message id on success", async () => {
    mockSend.mockResolvedValue({ data: { id: "email_123" }, error: null });
    const sendEmail = await loadSendEmail();

    const result = await sendEmail(rendered, "maeve@example.com");

    expect(result).toEqual({ delivered: true, id: "email_123" });
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "maeve@example.com",
        subject: rendered.subject,
      }),
      undefined,
    );
  });

  it("forwards an idempotency key to the provider", async () => {
    mockSend.mockResolvedValue({ data: { id: "email_123" }, error: null });
    const sendEmail = await loadSendEmail();

    await sendEmail(rendered, "maeve@example.com", {
      idempotencyKey: "verify-email/user-1",
    });

    expect(mockSend).toHaveBeenCalledWith(expect.any(Object), {
      idempotencyKey: "verify-email/user-1",
    });
  });

  it("retries transient (rate-limit) errors then succeeds", async () => {
    vi.useFakeTimers();
    mockSend
      .mockResolvedValueOnce({
        data: null,
        error: { name: "rate_limit_exceeded", message: "too many" },
      })
      .mockResolvedValueOnce({
        data: null,
        error: { name: "rate_limit_exceeded", message: "too many" },
      })
      .mockResolvedValueOnce({ data: { id: "email_ok" }, error: null });
    const sendEmail = await loadSendEmail();

    const promise = sendEmail(rendered, "maeve@example.com");
    await vi.advanceTimersByTimeAsync(10_000);
    const result = await promise;

    expect(result).toEqual({ delivered: true, id: "email_ok" });
    expect(mockSend).toHaveBeenCalledTimes(3);
  });

  it("does not retry permanent (validation) errors", async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { name: "validation_error", message: "invalid `to` field" },
    });
    const sendEmail = await loadSendEmail();

    await expect(sendEmail(rendered, "not-an-email")).rejects.toThrow(
      /invalid `to` field/,
    );
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("throws after exhausting retries on a persistent transient error", async () => {
    vi.useFakeTimers();
    mockSend.mockResolvedValue({
      data: null,
      error: { name: "rate_limit_exceeded", message: "too many" },
    });
    const sendEmail = await loadSendEmail();

    const promise = sendEmail(rendered, "maeve@example.com");
    const assertion = expect(promise).rejects.toThrow(/too many/);
    await vi.advanceTimersByTimeAsync(60_000);
    await assertion;

    // 1 initial attempt + 3 retries
    expect(mockSend).toHaveBeenCalledTimes(4);
  });
});
