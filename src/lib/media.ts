import "server-only";
import { randomUUID } from "node:crypto";
import { mediaPath } from "./media-key";
import { MEDIA_BUCKET, supabase } from "./supabase";

/**
 * Uploaded photos, clips and voice memos live in a private Supabase bucket.
 * The browser uploads straight to it through a signed upload link, and doors
 * store /api/media/<key>, which redirects to a 1-hour signed link.
 * File names are random UUIDs, so a door's media can't be guessed before it opens.
 */
export type MediaKind = "image" | "video" | "audio";

const MB = 1024 * 1024;
const MEDIA_LIMITS: Record<MediaKind, number> = { image: 15 * MB, video: 50 * MB, audio: 20 * MB };

const TYPES: Record<string, { ext: string; kind: MediaKind }> = {
  "image/jpeg": { ext: "jpg", kind: "image" },
  "image/png": { ext: "png", kind: "image" },
  "image/webp": { ext: "webp", kind: "image" },
  "image/gif": { ext: "gif", kind: "image" },
  "image/heic": { ext: "heic", kind: "image" },
  "video/mp4": { ext: "mp4", kind: "video" },
  "video/quicktime": { ext: "mov", kind: "video" },
  "video/webm": { ext: "webm", kind: "video" },
  "audio/mpeg": { ext: "mp3", kind: "audio" },
  "audio/mp4": { ext: "m4a", kind: "audio" },
  "audio/x-m4a": { ext: "m4a", kind: "audio" },
  "audio/aac": { ext: "aac", kind: "audio" },
  "audio/wav": { ext: "wav", kind: "audio" },
  "audio/x-wav": { ext: "wav", kind: "audio" },
  "audio/webm": { ext: "webm", kind: "audio" },
  "audio/ogg": { ext: "ogg", kind: "audio" },
};

/** Normalizes things like "audio/webm;codecs=opus" → "audio/webm". */
const baseType = (t: string) => t.split(";")[0].trim().toLowerCase();

function checkUpload(kind: MediaKind, contentType: string, size: number): { ext: string } | { error: string } {
  const t = TYPES[baseType(contentType)];
  if (!t || t.kind !== kind) return { error: `That file type (${contentType || "unknown"}) isn't supported here` };
  if (!Number.isFinite(size) || size <= 0) return { error: "That file looks empty" };
  if (size > MEDIA_LIMITS[kind]) return { error: `That file is too big (max ${MEDIA_LIMITS[kind] / MB} MB)` };
  // webm is ambiguous (audio or video), so tag it to keep the two apart.
  return { ext: t.ext === "webm" ? `webm-${kind === "audio" ? "a" : "v"}` : t.ext };
}

export async function createUpload(
  kind: MediaKind,
  contentType: string,
  size: number,
): Promise<{ uploadUrl: string; url: string; contentType: string } | { error: string }> {
  const check = checkUpload(kind, contentType, size);
  if ("error" in check) return check;
  const key = `${randomUUID()}.${check.ext}`;
  const { data, error } = await supabase().storage.from(MEDIA_BUCKET).createSignedUploadUrl(key);
  if (error || !data) {
    console.error("createSignedUploadUrl failed", error);
    return { error: "Couldn't start the upload. Is the media bucket set up?" };
  }
  return { uploadUrl: data.signedUrl, url: mediaPath(key), contentType: baseType(contentType) };
}

/** A 1-hour link to a stored file, or null if it doesn't exist. */
export async function signedMediaUrl(key: string): Promise<string | null> {
  const { data, error } = await supabase().storage.from(MEDIA_BUCKET).createSignedUrl(key, 60 * 60);
  return error || !data ? null : data.signedUrl;
}
