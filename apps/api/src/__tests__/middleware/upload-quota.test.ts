import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

const countMock = vi.fn();
vi.mock("../../services/uploads.service", () => ({
  countUploadsLast24h: (...args: unknown[]) => countMock(...args),
}));

import { uploadQuota, DAILY_UPLOAD_QUOTA } from "../../middleware/upload-quota";

function createMocks(user?: { userId: string; role: string }) {
  const req = { user } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next };
}

describe("uploadQuota middleware", () => {
  beforeEach(() => {
    countMock.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    const { req, res, next } = createMocks(undefined);
    await uploadQuota(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when count is below quota", async () => {
    countMock.mockResolvedValueOnce(DAILY_UPLOAD_QUOTA - 1);
    const { req, res, next } = createMocks({ userId: "u1", role: "PROVIDER" });
    await uploadQuota(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 429 when count is at or above quota", async () => {
    countMock.mockResolvedValueOnce(DAILY_UPLOAD_QUOTA);
    const { req, res, next } = createMocks({ userId: "u1", role: "PROVIDER" });
    await uploadQuota(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: "UPLOAD_QUOTA_EXCEEDED" }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards thrown errors to next()", async () => {
    const err = new Error("db down");
    countMock.mockRejectedValueOnce(err);
    const { req, res, next } = createMocks({ userId: "u1", role: "PROVIDER" });
    await uploadQuota(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
