"use client";

import { useState } from "react";
import { createUpload } from "@/app/studio/actions";
import type { MediaKind } from "@/lib/media";
import VoiceRecorder from "./VoiceRecorder";

const EXT_TYPES: Record<string, string> = {
  heic: "image/heic", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
  mov: "video/quicktime", mp4: "video/mp4", webm: "video/webm", m4a: "audio/mp4", mp3: "audio/mpeg", wav: "audio/wav",
};
const guessType = (f: File) => f.type || EXT_TYPES[f.name.split(".").pop()?.toLowerCase() ?? ""] || "";

/** Resizes photos to at most 1600px and re-encodes as JPEG (also strips GPS/location data). */
async function shrinkImage(file: File): Promise<Blob | null> {
  if (file.type === "image/gif") return null; // keep animation
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85));
}

function put(url: string, blob: Blob, type: string, onProgress: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection."));
    xhr.send(blob);
  });
}

const COPY: Record<MediaKind, { accept: string; choose: string; hint: string }> = {
  image: { accept: "image/*", choose: "Choose a photo", hint: "Photos are resized automatically, and location data is removed." },
  video: {
    accept: "video/mp4,video/quicktime,video/webm",
    choose: "Choose a clip",
    hint: "Up to 50 MB (about a minute at 1080p). On iPhone, Settings → Camera → Formats → “Most Compatible” makes clips play on every phone.",
  },
  audio: { accept: "audio/*", choose: "Upload an audio file", hint: "Or record one right here." },
};

type Props = { kind: MediaKind; value: string; onChange: (url: string) => void };

export default function MediaField({ kind, value, onChange }: Props) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const copy = COPY[kind];

  const upload = async (file: File) => {
    setError("");
    setProgress(0);
    try {
      let blob: Blob = file;
      let type = guessType(file);
      if (kind === "image") {
        const small = await shrinkImage(file).catch(() => null);
        if (small) {
          blob = small;
          type = "image/jpeg";
        }
      }
      const target = await createUpload(kind, type, blob.size);
      if ("error" in target) throw new Error(target.error);
      await put(target.uploadUrl, blob, target.contentType, setProgress);
      onChange(target.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="st-media">
      {value && (
        <div className="st-media-preview">
          {kind === "image" && (
            // eslint-disable-next-line @next/next/no-img-element -- uploaded file preview
            <img src={value} alt="Uploaded" />
          )}
          {kind === "video" && <video src={value} controls playsInline preload="metadata" />}
          {kind === "audio" && <audio src={value} controls preload="metadata" />}
        </div>
      )}

      {progress !== null ? (
        <div className="st-progress" aria-label="Uploading">
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
          <em>Uploading… {Math.round(progress * 100)}%</em>
        </div>
      ) : (
        <div className="st-row">
          <label className="st-btn soft">
            {value ? "Replace" : copy.choose}
            <input
              type="file"
              accept={copy.accept}
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void upload(f);
              }}
            />
          </label>
          {kind === "audio" && <VoiceRecorder onRecorded={(f) => void upload(f)} />}
          {value && (
            <button type="button" className="st-btn ghost" onClick={() => onChange("")}>
              Remove
            </button>
          )}
        </div>
      )}
      {error && <p className="st-error">{error}</p>}
      <p className="st-hint">{copy.hint}</p>
    </div>
  );
}
