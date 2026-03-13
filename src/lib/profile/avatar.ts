import { Image } from "react-native";
import { uploadStorageFile, deleteStorageFile } from "../api";

const MAX_LONGEST_SIDE = 512;
const JPEG_QUALITY = 0.85;

/** Prepared image ready for FormData upload. On React Native we use uri + name + type (no File type). */
export type PreparedAvatar = {
  uri: string;
  fileName: string;
  mimeType: string;
};

const DIMENSIONS_TIMEOUT_MS = 5000;

function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error("Image dimensions timeout")), DIMENSIONS_TIMEOUT_MS);
    Image.getSize(
      uri,
      (width, height) => {
        clearTimeout(timeoutId);
        resolve({ width, height });
      },
      (err) => {
        clearTimeout(timeoutId);
        reject(err);
      }
    );
  });
}

/**
 * Ensures image type, resizes so longest side ≤ 512px, converts to WebP or JPEG.
 * Returns a PreparedAvatar (uri + fileName + mimeType) to use when building FormData for upload.
 * Input is a local file URI (e.g. from ImagePicker on React Native).
 */
export async function prepareAvatarUpload(file: string): Promise<PreparedAvatar> {
  const ext = "jpg";
  const fileName = `avatar-${Date.now()}.${ext}`;
  const mimeType = "image/jpeg";

  let ImageManipulator: typeof import("expo-image-manipulator") | null = null;
  try {
    ImageManipulator = require("expo-image-manipulator");
  } catch {
    return { uri: file, fileName, mimeType };
  }
  if (!ImageManipulator) return { uri: file, fileName, mimeType };

  try {
    const { width, height } = await getImageDimensions(file);
    const maxSide = Math.max(width, height);
    if (maxSide <= MAX_LONGEST_SIDE) {
      const result = await ImageManipulator.manipulateAsync(file, [], {
        compress: JPEG_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      return { uri: result.uri, fileName, mimeType };
    }
    const scale = MAX_LONGEST_SIDE / maxSide;
    const newWidth = Math.round(width * scale);
    const newHeight = Math.round(height * scale);
    const result = await ImageManipulator.manipulateAsync(file, [{ resize: { width: newWidth, height: newHeight } }], {
      compress: JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return { uri: result.uri, fileName, mimeType };
  } catch {
    return { uri: file, fileName, mimeType };
  }
}

const AVATARS_BUCKET = "avatars";

export type UploadAvatarParams = {
  profileId: string;
  /** Local file URI (e.g. from ImagePicker). */
  file: string;
  updateProfile: (patch: { avatar_url: string | null }) => Promise<void>;
};

/**
 * Upload avatar: prepare image, POST /api/storage/upload, then update profile with returned URL.
 * FormData: file, bucket: "avatars", folder: "avatars/{profileId}".
 * API returns { url, path, bucket }; we use url and call updateProfile({ avatar_url: url }).
 */
export async function uploadAvatar({ profileId, file, updateProfile }: UploadAvatarParams): Promise<string> {
  const prepared = await prepareAvatarUpload(file);

  const formData = new FormData();
  formData.append("file", {
    uri: prepared.uri,
    name: prepared.fileName,
    type: prepared.mimeType,
  } as unknown as Blob);
  formData.append("bucket", AVATARS_BUCKET);
  formData.append("folder", `avatars/${profileId}`);

  const res = await uploadStorageFile(formData);
  const url = typeof res?.url === "string" && res.url.trim() ? res.url.trim() : null;
  if (!url) {
    throw new Error("Server did not return an avatar URL. Expected response to include url.");
  }

  await updateProfile({ avatar_url: url });
  return url;
}

/**
 * Parses bucket and path from a Supabase storage public URL.
 * URL format: .../storage/v1/object/public/<bucket>/<path>
 */
function parseStoragePublicUrl(url: string): { bucket: string; path: string } | null {
  const match = url.match(/\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return null;
  return { bucket: match[1], path: match[2] };
}

/**
 * Remove avatar: if currentAvatarUrl is a Supabase storage URL, POST /api/storage/delete with { bucket, path }.
 * Regardless of delete result, calls updateProfile({ avatar_url: null }) so the DB no longer points to an avatar.
 */
export async function clearAvatar(
  currentAvatarUrl: string | null | undefined,
  updateProfile: (patch: { avatar_url: string | null }) => Promise<void>
): Promise<void> {
  if (currentAvatarUrl?.trim()) {
    const parsed = parseStoragePublicUrl(currentAvatarUrl.trim());
    if (parsed) {
      try {
        await deleteStorageFile(parsed.bucket, parsed.path);
      } catch (e) {
        console.warn("[Avatar] Storage delete failed. Clearing profile anyway.", e);
      }
    }
  }

  await updateProfile({ avatar_url: null });
}
