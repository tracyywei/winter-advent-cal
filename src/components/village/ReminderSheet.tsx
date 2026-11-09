"use client";

import { useEffect, useState, type FormEvent } from "react";
import { postJSON, type Api } from "./DoorBody";

type Props = {
  api: Api;
  slug: string;
  recipientName: string;
  fromName: string;
  nextDay: number;
  onClose: () => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatPhone(input: string) {
  const d = input.replace(/\D/g, "").replace(/^1(?=\d{10})/, "").slice(0, 10);
  if (d.length > 6) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length > 3) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return d;
}

export default function ReminderSheet({ api, slug, recipientName, fromName, nextDay, onClose }: Props) {
  const [mode, setMode] = useState<"sms" | "email">("sms");
  const [value, setValue] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [host] = useState(() => window.location.host);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const swapMode = () => {
    setMode(mode === "sms" ? "email" : "sms");
    setValue("");
    setError("");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "sms") {
      if (value.replace(/\D/g, "").length !== 10) return setError("That number looks a little short 📱");
      if (!consent) return setError("Tick the box so the reminders can be sent 💌");
    } else if (!EMAIL_RE.test(value.trim())) {
      return setError("Hmm, double-check that email ✉️");
    }
    setBusy(true);
    try {
      await postJSON(api("/subscribe"), { channel: mode, address: value, consent: mode === "sms" ? consent : undefined });
      setDone(true);
    } catch {
      setError("Something went wrong. Try again?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="va-sheet-wrap" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="va-sheet" role="dialog" aria-modal="true" aria-label="Daily reminders">
        <button type="button" className="va-x" onClick={onClose} aria-label="Close">
          ✕
        </button>

        {done ? (
          <>
            <h3>You&apos;re on the list! 🎄</h3>
            <p>
              {mode === "sms" ? "Look out for a text" : "Look out for an email"} at 9am PT each morning in December.
            </p>
            <button type="button" className="va-btn big" onClick={onClose}>
              Back to the village
            </button>
          </>
        ) : (
          <>
            <h3>🔔 Daily door reminders</h3>
            <p>Get a little nudge at 9am PT every morning when your next door is ready.</p>
            <div className="va-bubble-from">Here&apos;s what it&apos;ll look like:</div>
            <div className="va-bubble">
              Good morning {recipientName}! Door #{nextDay} on {fromName}&apos;s advent calendar for you is ready 🎄{" "}
              <span>
                {host}/c/{slug}
              </span>
            </div>

            <form onSubmit={submit} noValidate>
              <label>
                {mode === "sms" ? "Phone number" : "Email"}
                <input
                  className="va-field"
                  type={mode === "sms" ? "tel" : "email"}
                  inputMode={mode === "sms" ? "tel" : "email"}
                  autoComplete={mode === "sms" ? "tel-national" : "email"}
                  placeholder={mode === "sms" ? "(555) 123-4567" : "you@example.com"}
                  value={value}
                  onChange={(e) => setValue(mode === "sms" ? formatPhone(e.target.value) : e.target.value)}
                />
              </label>
              {mode === "sms" && (
                <label className="va-consent">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  <span>
                    Text me a daily reminder Dec 1–25. Msg &amp; data rates may apply. Reply STOP to opt out.
                  </span>
                </label>
              )}
              {error && <p className="va-error">{error}</p>}
              <button className="va-btn big" type="submit" disabled={busy}>
                {busy ? "Signing you up…" : "Sign me up ✨"}
              </button>
              <button className="va-linkbtn" type="button" onClick={swapMode}>
                {mode === "sms" ? "Email me instead" : "Text me instead"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
