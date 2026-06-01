"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import {
  ALLOWED_UPLOAD_CONTENT_TYPES,
  MAX_UPLOAD_BYTES,
  type UPLOAD_PURPOSES,
} from "@faineant/shared";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

type AllowedType = (typeof ALLOWED_UPLOAD_CONTENT_TYPES)[number];
type Purpose = (typeof UPLOAD_PURPOSES)[number];

interface UploaderProps {
  /** Called with the final public URL once the upload + finalize succeed. */
  onUploaded: (url: string) => void;
  /** Comma-separated accept list for the file input. Defaults to image types. */
  accept?: string;
  /** Maximum size in bytes. Defaults to MAX_UPLOAD_BYTES (8 MB). */
  maxBytes?: number;
  /** Purpose tag stored alongside the upload record. */
  purpose?: Purpose;
  /** Optional label shown in the drop zone. */
  label?: string;
  className?: string;
}

interface SignResponse {
  success: true;
  data: {
    uploadUrl: string;
    publicUrl: string;
    key: string;
    expiresIn: number;
  };
}

interface ApiError {
  success: false;
  error: { code: string; message: string };
}

export function Uploader({
  onUploaded,
  accept = "image/jpeg,image/png,image/webp",
  maxBytes = MAX_UPLOAD_BYTES,
  purpose,
  label = "Drop an image, or click to choose",
  className,
}: UploaderProps) {
  const { accessToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  const reset = useCallback(() => {
    setProgress(null);
    setError(null);
    setFilename(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setFilename(file.name);

      if (!ALLOWED_UPLOAD_CONTENT_TYPES.includes(file.type as AllowedType)) {
        setError("Only JPEG, PNG, and WebP images are allowed.");
        setProgress(null);
        return;
      }
      if (file.size > maxBytes) {
        const mb = (maxBytes / 1024 / 1024).toFixed(0);
        setError(`File exceeds ${mb} MB limit.`);
        setProgress(null);
        return;
      }
      if (!accessToken) {
        setError("You must be signed in to upload.");
        setProgress(null);
        return;
      }

      setProgress(0);

      // 1. Ask the API for a presigned URL.
      let sign: SignResponse["data"];
      try {
        const signRes = await fetch(`${API_URL}/uploads/sign`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            contentType: file.type,
            sizeBytes: file.size,
            purpose,
            filename: file.name,
          }),
        });
        const json: SignResponse | ApiError = await signRes.json();
        if (!signRes.ok || !json.success) {
          const message =
            !json.success && json.error?.message
              ? json.error.message
              : "Could not start upload.";
          setError(message);
          setProgress(null);
          return;
        }
        sign = json.data;
      } catch {
        setError("Network error. Please try again.");
        setProgress(null);
        return;
      }

      // 2. PUT the file directly to R2 with progress events (XHR for upload progress).
      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", sign.uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded / e.total) * 100));
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Upload failed (${xhr.status})`));
          };
          xhr.onerror = () => reject(new Error("Upload network error"));
          xhr.send(file);
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
        setProgress(null);
        return;
      }

      // 3. Finalize: API HEADs the object and records metadata.
      try {
        const finRes = await fetch(`${API_URL}/uploads/finalize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            key: sign.key,
            contentType: file.type,
            sizeBytes: file.size,
            purpose,
          }),
        });
        const json: { success: true; data: { url: string } } | ApiError =
          await finRes.json();
        if (!finRes.ok || !json.success) {
          const message =
            !json.success && json.error?.message
              ? json.error.message
              : "Could not finalize upload.";
          setError(message);
          setProgress(null);
          return;
        }
        setProgress(100);
        onUploaded(json.data.url);
        // Settle UI back to idle shortly after success.
        setTimeout(reset, 600);
      } catch {
        setError("Could not finalize upload.");
        setProgress(null);
      }
    },
    [accessToken, maxBytes, onUploaded, purpose, reset],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const isUploading = progress !== null && progress < 100;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload image"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-3 border border-dashed px-6 py-10 text-center cursor-pointer transition-colors duration-[250ms] ease-fai-smooth",
          "bg-smoke-900",
          isDragging
            ? "border-champagne-400 bg-smoke-800"
            : "border-taupe-500 hover:border-champagne-400",
          isUploading && "pointer-events-none opacity-60",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={onChange}
          className="hidden"
          aria-hidden="true"
        />

        {isUploading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-champagne-400" />
            <p className="text-label uppercase tracking-[0.28em] text-taupe-300">
              Uploading… {progress}%
            </p>
            <div
              className="h-px w-full max-w-xs bg-smoke-700 overflow-hidden"
              role="progressbar"
              aria-valuenow={progress ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-champagne-400 transition-all duration-[250ms] ease-fai-smooth"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        ) : progress === 100 ? (
          <p className="text-label uppercase tracking-[0.28em] text-champagne-400">
            Uploaded.
          </p>
        ) : (
          <>
            <Upload className="h-5 w-5 text-taupe-300" />
            <p className="font-editorial italic text-body-sm text-bone-200">
              {label}
            </p>
            <p className="text-label uppercase tracking-[0.28em] text-taupe-300">
              JPG · PNG · WEBP · ≤ {(maxBytes / 1024 / 1024).toFixed(0)} MB
            </p>
          </>
        )}
      </div>

      {filename && !isUploading && !error && progress !== 100 && (
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="font-mono text-caption text-taupe-300 truncate">
            {filename}
          </span>
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1 text-label uppercase tracking-[0.28em] text-taupe-300 hover:text-champagne-400"
            aria-label="Clear file"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="border border-oxblood-500 bg-smoke-800 px-3 py-2 text-label uppercase tracking-[0.18em] text-bone-200"
        >
          {error}
        </div>
      )}
    </div>
  );
}

export default Uploader;
