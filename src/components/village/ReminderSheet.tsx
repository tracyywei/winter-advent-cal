"use client";

import { useEffect, useState, type FormEvent } from "react";
import { postJSON, type Api } from "./DoorBody";

type Props = {
  api: Api;
  slug: string;
  recipientName: string;
  fromName: string;
  onClose: () => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatPhone(input: string) {
  const d = input.replace(/\D/g, "").replace(/^1(?=\d{10})/, "").slice(0, 10);
  if (d.length > 6) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length > 3) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return d;
}

export default function ReminderSheet({ api, slug, recipientName, fromName, onClose }: Props) {
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
      if (!consent) return setError(`Tick the box so ${fromName} knows it's okay to text you 💌`);
    } else if (!EMAIL_RE.test(value.trim())) {
      return setError("Hmm, double-check that email ✉️");
    }
    setBusy(true);
    try {
      await postJSON(api("/subscribe"), {
        channel: mode,
        address: value,
        consent: mode === "sms" ? consent : undefined,
        // So the morning text arrives at 9am where they live.
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setDone(true);
    } catch {
      setError("Something went wrong. Try again?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="va-sheet-wrap" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="va-sheet" role="dialog" aria-modal="true" aria-label="Morning reminders">
        <button type="button" className="va-x" onClick={onClose} aria-label="Close">
          ✕
        </button>

        {done ? (
          <>
            <h3>You&apos;re on the list! 🎄</h3>
            <p>
              Look out for {mode === "sms" ? "a text" : "an email"} from {fromName} at 9am your time on December mornings.
            </p>
            <button type="button" className="va-btn big" onClick={onClose}>
              Back to the tree
            </button>
          </>
        ) : (
          <>
            <h3>🔔 Morning reminders</h3>
            <p>
              {fromName} will send you a little nudge at 9am your time on December mornings, so you never miss an ornament.
            </p>
            <div className="va-bubble-from">Here&apos;s what it&apos;ll look like:</div>
            <div className="va-bubble">
              Good morning {recipientName}! A new ornament is waiting on your advent tree from {fromName} 🎄{" "}
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
                    Yes, {fromName} can text me on December mornings. Just let {fromName} know if you&apos;d like to stop.
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
