import crypto from "crypto";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  ALLOWED_UPLOAD_CONTENT_TYPES,
  type UploadSignInput,
  type UploadFinalizeInput,
} from "@faineant/shared";
import { env } from "../config/env";
import { prisma } from "../config/database";
import { AppError } from "../middleware/error-handler";

const SIGN_EXPIRES_IN_SECONDS = 60 * 5; // 5 minutes

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

let cachedClient: S3Client | null = null;

export function getS3Client(): S3Client {
  if (cachedClient) return cachedClient;

  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    throw new AppError(
      503,
      "STORAGE_UNCONFIGURED",
      "Object storage is not configured",
    );
  }

  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  return cachedClient;
}

/** Reset the cached client. Test-only. */
export function __resetS3Client(client?: S3Client | null) {
  cachedClient = client ?? null;
}

export function buildPublicUrl(key: string): string {
  const base = env.R2_PUBLIC_URL?.replace(/\/$/, "") ?? "";
  return `${base}/${key}`;
}

export function buildObjectKey(userId: string, contentType: string): string {
  if (!ALLOWED_UPLOAD_CONTENT_TYPES.includes(contentType as never)) {
    throw new AppError(400, "VALIDATION_ERROR", "Unsupported content type");
  }
  const ext = EXTENSION_BY_TYPE[contentType];
  const uuid = crypto.randomUUID();
  return `users/${userId}/${uuid}.${ext}`;
}

export async function createPresignedUpload(
  userId: string,
  input: UploadSignInput,
): Promise<{ uploadUrl: string; publicUrl: string; key: string; expiresIn: number }> {
  const bucket = env.R2_BUCKET;
  if (!bucket) {
    throw new AppError(503, "STORAGE_UNCONFIGURED", "Bucket not configured");
  }

  const key = buildObjectKey(userId, input.contentType);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: input.contentType,
    ContentLength: input.sizeBytes,
  });

  const client = getS3Client();
  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: SIGN_EXPIRES_IN_SECONDS,
  });

  return {
    uploadUrl,
    publicUrl: buildPublicUrl(key),
    key,
    expiresIn: SIGN_EXPIRES_IN_SECONDS,
  };
}

export async function finalizeUpload(
  userId: string,
  input: UploadFinalizeInput,
): Promise<{ url: string; key: string; sizeBytes: number; contentType: string }> {
  const bucket = env.R2_BUCKET;
  if (!bucket) {
    throw new AppError(503, "STORAGE_UNCONFIGURED", "Bucket not configured");
  }

  // Enforce path scoping: key must belong to this user
  if (!input.key.startsWith(`users/${userId}/`)) {
    throw new AppError(403, "FORBIDDEN", "Key does not belong to user");
  }

  // HEAD to confirm the object exists in R2
  const client = getS3Client();
  try {
    await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: input.key }),
    );
  } catch (err) {
    throw new AppError(
      404,
      "UPLOAD_NOT_FOUND",
      "Object was not found in storage. Did the PUT complete?",
    );
  }

  const url = buildPublicUrl(input.key);

  await prisma.uploadRecord.upsert({
    where: { key: input.key },
    update: {
      url,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      purpose: input.purpose ?? null,
    },
    create: {
      userId,
      key: input.key,
      url,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      purpose: input.purpose ?? null,
    },
  });

  return {
    url,
    key: input.key,
    sizeBytes: input.sizeBytes,
    contentType: input.contentType,
  };
}

export async function countUploadsLast24h(userId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return prisma.uploadRecord.count({
    where: { userId, createdAt: { gte: since } },
  });
}
