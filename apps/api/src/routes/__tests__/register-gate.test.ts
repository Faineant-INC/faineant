import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";

const { envState, mockRegister } = vi.hoisted(() => ({
  envState: { LAUNCH_MODE: false },
  mockRegister: vi.fn(),
}));

// Spread the real env so unrelated config (JWT secrets, etc.) stays valid;
// override LAUNCH_MODE with a getter so tests can toggle it at request time.
vi.mock("../../config/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../config/env")>();
  return {
    ...actual,
    env: {
      ...actual.env,
      get LAUNCH_MODE() {
        return envState.LAUNCH_MODE;
      },
    },
  };
});

vi.mock("../../services/auth.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/auth.service")>();
  return { ...actual, register: mockRegister };
});

import authRouter from "../auth.routes";
import { errorHandler } from "../../middleware/error-handler";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/auth", authRouter);
  app.use(errorHandler);
  return app;
}

const validBody = {
  email: "new@example.com",
  password: "Aa1!aaaa",
  firstName: "New",
  lastName: "User",
  role: "CLIENT",
};

describe("POST /auth/register — launch gate", () => {
  beforeEach(() => {
    mockRegister.mockReset();
    envState.LAUNCH_MODE = false;
  });

  it("returns 403 SIGNUPS_DISABLED when pre-launch", async () => {
    envState.LAUNCH_MODE = false;
    const res = await request(buildApp()).post("/auth/register").send(validBody);
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: "SIGNUPS_DISABLED" },
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("allows registration when launched", async () => {
    envState.LAUNCH_MODE = true;
    mockRegister.mockResolvedValue({
      user: { id: "u1", email: "new@example.com" },
      tokens: { accessToken: "a", refreshToken: "r" },
    });
    const res = await request(buildApp()).post("/auth/register").send(validBody);
    expect(res.status).toBe(201);
    expect(mockRegister).toHaveBeenCalledOnce();
  });
});
