/**
 * Uploaded files are named <uuid>.<ext>, e.g. "3f2a…e1.jpg". webm can be audio or
 * video, so it's stored as "webm-a" or "webm-v". Shared by the browser and server.
 */
export const MEDIA_KEY_RE = /^[0-9a-f-]{36}\.[a-z0-9]{2,4}(?:-[av])?$/;

/** Where a door points at an uploaded file: /api/media/<key>. */
export const mediaPath = (key: string) => `/api/media/${key}`;

export const isMediaPath = (s: string) => s.startsWith("/api/media/") && MEDIA_KEY_RE.test(s.slice("/api/media/".length));
