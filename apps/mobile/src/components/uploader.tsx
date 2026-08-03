import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  ALLOWED_UPLOAD_CONTENT_TYPES,
  MAX_UPLOAD_BYTES,
  type UPLOAD_PURPOSES,
} from "@faineant/shared";
import { colors, fonts } from "@/theme";
import { supabase } from "@/lib/supabase";

type Purpose = (typeof UPLOAD_PURPOSES)[number];

interface UploaderProps {
  onUploaded: (url: string) => void;
  purpose?: Purpose;
  /** Existing image preview URL (e.g., current avatar). */
  initialUrl?: string;
  label?: string;
}

function mimeFromUri(uri: string): "image/jpeg" | "image/png" | "image/webp" {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export function Uploader({
  onUploaded,
  purpose,
  initialUrl,
  label = "Choose a photo",
}: UploaderProps) {
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pickAndUpload() {
    setError(null);

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Permission denied. Allow photo access in Settings.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: true,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const contentType = mimeFromUri(asset.uri);
    if (!ALLOWED_UPLOAD_CONTENT_TYPES.includes(contentType)) {
      setError("Only JPEG, PNG, and WebP images are allowed.");
      return;
    }
    const sizeBytes = asset.fileSize ?? 0;
    if (sizeBytes > MAX_UPLOAD_BYTES) {
      setError(
        `File exceeds ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)} MB limit.`,
      );
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      setError("You must be signed in to upload.");
      return;
    }

    setProgress(0);
    try {
      const bytes = await (await fetch(asset.uri)).arrayBuffer();
      const safeName = (asset.fileName ?? "upload.jpg").replace(
        /[^a-zA-Z0-9._-]+/g,
        "-",
      );
      const uniqueId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const path = `${user.id}/${purpose ?? "general"}/${uniqueId}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(path, bytes, {
          contentType,
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadError) throw uploadError;
      setProgress(75);
      const { data } = supabase.storage.from("uploads").getPublicUrl(path);
      if (!data.publicUrl) throw new Error("Could not create the upload URL.");
      setPreview(data.publicUrl);
      setProgress(100);
      onUploaded(data.publicUrl);
      setTimeout(() => setProgress(null), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setProgress(null);
    }
  }

  const isUploading = progress !== null && progress < 100;

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Upload image"
        onPress={pickAndUpload}
        disabled={isUploading}
        style={({ pressed }) => [
          styles.dropzone,
          pressed && styles.dropzonePressed,
          isUploading && styles.dropzoneDisabled,
        ]}
      >
        {preview ? (
          <Image source={{ uri: preview }} style={styles.preview} />
        ) : isUploading ? (
          <>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.label}>Uploading… {progress}%</Text>
          </>
        ) : (
          <>
            <Text style={styles.label}>{label.toUpperCase()}</Text>
            <Text style={styles.hint}>JPG · PNG · WEBP · ≤ 8 MB</Text>
          </>
        )}
      </Pressable>

      {error && (
        <View style={styles.errorBox} accessibilityLiveRegion="polite">
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  dropzone: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.hairlineWarm,
    backgroundColor: colors.card,
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 160,
  },
  dropzonePressed: {
    borderColor: colors.accent,
  },
  dropzoneDisabled: {
    opacity: 0.6,
  },
  preview: {
    width: "100%",
    aspectRatio: 1,
    resizeMode: "cover",
  },
  label: {
    color: colors.mutedFg,
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 2.4,
  },
  hint: {
    color: colors.mutedFg,
    fontFamily: fonts.bodyLight,
    fontSize: 11,
    letterSpacing: 1.6,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: colors.oxblood?.[500] ?? "#7a1f1f",
    backgroundColor: colors.card,
    padding: 10,
  },
  errorText: {
    color: colors.secondaryFg,
    fontFamily: fonts.body,
    fontSize: 12,
  },
});

export default Uploader;
