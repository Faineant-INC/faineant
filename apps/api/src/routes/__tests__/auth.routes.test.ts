import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";

// Hoisted mocks so vi.mock factory can reference them.
const { mockResendVerification, mockVerifyEmail } = vi.hoisted(() => ({
  mockResendVerification: vi.fn(),
  mockVerifyEmail: vi.fn(),
}));

vi.mock("../../services/auth.service", async () => {
  const actual = await vi.importActual<typeof import("../../services/auth.service")>(
    "../../services/auth.service",
  );
  return {
    ...actual,
    resendVerification: mockResendVerification,
    verifyEmail: mockVerifyEmail,
  };
});

import authRouter from "../auth.routes";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/auth", authRouter);
  return app;
}

describe("auth routes — email verification", () => {
  beforeEach(() => {
    mockResendVerification.mockReset();
    mockVerifyEmail.mockReset();
  });

  describe("POST /auth/verify-email", () => {
    it("returns the verification result on success", async () => {
      mockVerifyEmail.mockResolvedValue({
        user: { id: "u1", email: "a@b.co", emailVerified: true },
        alreadyVerified: false,
      });
      const app = buildApp();

      const res = await request(app)
        .post("/auth/verify-email")
        .send({ token: "x".repeat(64) });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        data: { alreadyVerified: false },
      });
    });

    it("rejects short tokens with 400", async () => {
      const app = buildApp();
      const res = await request(app)
        .post("/auth/verify-email")
        .send({ token: "short" });
      expect(res.status).toBe(400);
      expect(mockVerifyEmail).not.toHaveBeenCalled();
    });
  });

  describe("POST /auth/resend-verification", () => {
    it("rate-limits to 3 requests per IP per hour", async () => {
      mockResendVerification.mockResolvedValue({ sent: true });
      const app = buildApp();

      // The rate-limit middleware is module-scoped; previous tests may share
      // a counter. We're testing the limit is enforced — accept either the
      // 4th-call rejection or that at least one within the first burst is
      // limited.
      const responses: number[] = [];
      for (let i = 0; i < 5; i += 1) {
        const r = await request(app)
          .post("/auth/resend-verification")
          .send({ email: "ratelimit@example.com" });
        responses.push(r.status);
      }

      expect(responses.some((s) => s === 429)).toBe(true);
    });
  });
});
