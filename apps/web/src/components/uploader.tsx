"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import {
  ALLOWED_UPLOAD_CONTENT_TYPES,
  MAX_UPLOAD_BYTES,
  type UPLOAD_PURPOSES,
} from "@faineant/shared";
import { useAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const supabase = createClient();

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
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) throw new Error("You must be signed in to upload.");

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
        const uniqueId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const path = `${user.id}/${purpose ?? "general"}/${uniqueId}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("uploads")
          .upload(path, file, {
            contentType: file.type,
            cacheControl: "3600",
            upsert: false,
          });
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("uploads").getPublicUrl(path);
        if (!data.publicUrl) throw new Error("Could not create the upload URL.");
        setProgress(100);
        onUploaded(data.publicUrl);
        setTimeout(reset, 600);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
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
