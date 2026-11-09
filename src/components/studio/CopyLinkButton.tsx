"use client";

import { useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

export function useOrigin() {
  return useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
}

export default function CopyLinkButton({ slug, className = "st-btn soft" }: { slug: string; className?: string }) {
  const origin = useOrigin();
  const [copied, setCopied] = useState(false);
  const url = `${origin}/c/${slug}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  return (
    <button type="button" className={className} onClick={copy}>
      {copied ? "Copied! ✓" : "🔗 Copy link"}
    </button>
  );
}
