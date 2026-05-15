import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock env BEFORE importing the service.
vi.mock("../../config/env", () => ({
  env: {
    R2_ACCOUNT_ID: "test-account",
    R2_ACCESS_KEY_ID: "test-key",
    R2_SECRET_ACCESS_KEY: "test-secret",
    R2_BUCKET: "faineant-uploads",
    R2_PUBLIC_URL: "https://uploads.test",
  },
}));

const mockUpsert = vi.fn();
const mockCount = vi.fn();
vi.mock("../../config/database", () => ({
  prisma: {
    uploadRecord: {
      upsert: (...args: unknown[]) => mockUpsert(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

// Mock @aws-sdk/s3-request-presigner
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://signed.example.com/put"),
}));

// Mock @aws-sdk/client-s3
const sendMock = vi.fn();
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: sendMock,
  })),
  PutObjectCommand: vi.fn((args) => ({ __type: "PutObject", ...args })),
  HeadObjectCommand: vi.fn((args) => ({ __type: "HeadObject", ...args })),
}));

import {
  createPresignedUpload,
  finalizeUpload,
  buildObjectKey,
  buildPublicUrl,
  countUploadsLast24h,
  __resetS3Client,
} from "../../services/uploads.service";

describe("uploads.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetS3Client();
  });

  describe("buildObjectKey", () => {
    it("creates a users/<userId>/<uuid>.<ext> key for jpeg", () => {
      const key = buildObjectKey("user-123", "image/jpeg");
      expect(key).toMatch(/^users\/user-123\/[a-f0-9-]+\.jpg$/);
    });

    it("uses .png for image/png", () => {
      const key = buildObjectKey("user-123", "image/png");
      expect(key).toMatch(/\.png$/);
    });

    it("uses .webp for image/webp", () => {
      const key = buildObjectKey("user-123", "image/webp");
      expect(key).toMatch(/\.webp$/);
    });

    it("throws for unsupported content type", () => {
      expect(() => buildObjectKey("user-123", "image/gif")).toThrow();
    });
  });

  describe("buildPublicUrl", () => {
    it("joins base + key", () => {
      expect(buildPublicUrl("users/u/abc.jpg")).toBe(
        "https://uploads.test/users/u/abc.jpg",
      );
    });
  });

  describe("createPresignedUpload", () => {
    it("returns uploadUrl, publicUrl, key", async () => {
      const result = await createPresignedUpload("user-123", {
        contentType: "image/jpeg",
        sizeBytes: 1024,
      });
      expect(result.uploadUrl).toBe("https://signed.example.com/put");
      expect(result.publicUrl).toMatch(
        /^https:\/\/uploads\.test\/users\/user-123\/.+\.jpg$/,
      );
      expect(result.key).toMatch(/^users\/user-123\/.+\.jpg$/);
      expect(result.expiresIn).toBeGreaterThan(0);
    });
  });

  describe("finalizeUpload", () => {
    it("HEADs the object, then upserts an UploadRecord and returns metadata", async () => {
      sendMock.mockResolvedValueOnce({}); // HEAD succeeds
      mockUpsert.mockResolvedValueOnce({});

      const result = await finalizeUpload("user-123", {
        key: "users/user-123/abc.jpg",
        contentType: "image/jpeg",
        sizeBytes: 2048,
        purpose: "portfolio",
      });

      expect(sendMock).toHaveBeenCalledOnce();
      expect(mockUpsert).toHaveBeenCalledOnce();
      const upsertArg = mockUpsert.mock.calls[0]![0] as {
        create: { userId: string; purpose: string };
      };
      expect(upsertArg.create.userId).toBe("user-123");
      expect(upsertArg.create.purpose).toBe("portfolio");

      expect(result).toEqual({
        url: "https://uploads.test/users/user-123/abc.jpg",
        key: "users/user-123/abc.jpg",
        sizeBytes: 2048,
        contentType: "image/jpeg",
      });
    });

    it("rejects keys outside the user's prefix", async () => {
      await expect(
        finalizeUpload("user-123", {
          key: "users/other-user/abc.jpg",
          contentType: "image/jpeg",
          sizeBytes: 100,
        }),
      ).rejects.toMatchObject({ statusCode: 403, code: "FORBIDDEN" });
    });

    it("returns 404 when HEAD fails (object missing)", async () => {
      sendMock.mockRejectedValueOnce(new Error("NotFound"));

      await expect(
        finalizeUpload("user-123", {
          key: "users/user-123/missing.jpg",
          contentType: "image/jpeg",
          sizeBytes: 100,
        }),
      ).rejects.toMatchObject({
        statusCode: 404,
        code: "UPLOAD_NOT_FOUND",
      });
    });
  });

  describe("countUploadsLast24h", () => {
    it("counts records for the user within the last 24h window", async () => {
      mockCount.mockResolvedValueOnce(7);
      const count = await countUploadsLast24h("user-123");
      expect(count).toBe(7);
      const arg = mockCount.mock.calls[0]![0] as {
        where: { userId: string; createdAt: { gte: Date } };
      };
      expect(arg.where.userId).toBe("user-123");
      expect(arg.where.createdAt.gte).toBeInstanceOf(Date);
    });
  });
});
