import { z } from "zod";

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Storage object path for the `uploads` bucket: `<userId>/<uuid>.<ext>`. */
export function storageObjectPath(userId: string, contentType: string): string {
  const ext = EXT_BY_TYPE[contentType];
  if (!ext) throw new Error("Unsupported content type");
  // crypto.randomUUID() is a global in Node 20+, browsers, and Deno
  return `${userId}/${(crypto as { randomUUID(): string }).randomUUID()}.${ext}`;
}

export const ALLOWED_UPLOAD_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

export const UPLOAD_PURPOSES = [
  "avatar",
  "portfolio",
  "review",
  "post",
  "message",
] as const;

export const uploadSignSchema = z.object({
  contentType: z.enum(ALLOWED_UPLOAD_CONTENT_TYPES, {
    errorMap: () => ({ message: "Unsupported content type" }),
  }),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(MAX_UPLOAD_BYTES, `File exceeds ${MAX_UPLOAD_BYTES} bytes`),
  purpose: z.enum(UPLOAD_PURPOSES).optional(),
  filename: z.string().max(255).optional(),
});

export type UploadSignInput = z.infer<typeof uploadSignSchema>;

export interface UploadSignResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}

export const uploadFinalizeSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(512)
    .regex(/^users\/[a-z0-9-]+\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/i, "Invalid key"),
  contentType: z.enum(ALLOWED_UPLOAD_CONTENT_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  purpose: z.enum(UPLOAD_PURPOSES).optional(),
});

export type UploadFinalizeInput = z.infer<typeof uploadFinalizeSchema>;

export interface UploadFinalizeResponse {
  url: string;
  key: string;
  sizeBytes: number;
  contentType: string;
}
