"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Toast = (message: string) => void;

export function useToast() {
  const [text, setText] = useState("");
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const toast = useCallback<Toast>((message) => {
    setText(message);
    setVisible(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setVisible(false), 2200);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const toastEl = (
    <div className={`va-toast${visible ? " show" : ""}`} role="status" aria-live="polite">
      {text}
    </div>
  );
  return { toast, toastEl };
}
