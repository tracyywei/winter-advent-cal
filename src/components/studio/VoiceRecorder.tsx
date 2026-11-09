"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_SECONDS = 180;
// Prefer MP4/AAC: it plays on every phone, including older iPhones.
const MIME_PREFERENCE = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];

export default function VoiceRecorder({ onRecorded }: { onRecorded: (file: File) => void }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const stop = useCallback(() => {
    window.clearInterval(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
    recorder.current = null;
    setRecording(false);
  }, []);

  useEffect(() => stop, [stop]);

  const start = async () => {
    setError("");
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices) {
      setError("This browser can't record audio. Try uploading a voice memo instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MIME_PREFERENCE.find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = (rec.mimeType || mime || "audio/webm").split(";")[0];
        if (!chunks.length) return;
        onRecorded(new File(chunks, `voice-memo.${type === "audio/mp4" ? "m4a" : "webm"}`, { type }));
      };
      rec.start(250);
      recorder.current = rec;
      const startedAt = Date.now();
      setSeconds(0);
      setRecording(true);
      timer.current = window.setInterval(() => {
        const s = Math.floor((Date.now() - startedAt) / 1000);
        setSeconds(s);
        if (s >= MAX_SECONDS) stop();
      }, 250);
    } catch {
      setError("Microphone access was blocked. Allow it in your browser settings to record.");
    }
  };

  return (
    <>
      {recording ? (
        <button type="button" className="st-btn danger" onClick={stop}>
          ■ Stop ({Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")})
        </button>
      ) : (
        <button type="button" className="st-btn soft" onClick={start}>
          🎙️ Record
        </button>
      )}
      {error && <p className="st-error">{error}</p>}
    </>
  );
}
