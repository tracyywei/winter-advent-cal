"use client";

import { useState } from "react";
import type { Subscription } from "@/lib/types";
import { useOrigin } from "./CopyLinkButton";

type Person = { name: string; slug: string; subscriptions: Subscription[]; finished: boolean };

const prettyPhone = (e164: string) => {
  const d = e164.replace(/^\+1/, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : e164;
};

/**
 * The list the owner's iPhone Shortcut reads: one "Name|phone or email|link" line per sign-up.
 * People who already opened all 12 ornaments are left out so they stop getting nudges.
 */
export default function MorningTexts({ people }: { people: Person[] }) {
  const origin = useOrigin();
  const [copied, setCopied] = useState(false);

  const lines = people.filter((p) => !p.finished).flatMap((p) =>
    p.subscriptions.map((s) => [p.name.replace(/\|/g, " "), s.address, `${origin}/c/${p.slug}`].join("|")),
  );
  const signedUp = people.filter((p) => p.subscriptions.length > 0).length;

  const copy = async () => {
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy this list:", text);
    }
  };

  return (
    <section className="st-card">
      <h2>
        📱 Morning texts <small>{signedUp}/{people.length} signed up</small>
      </h2>
      <p className="st-muted st-texts-intro">
        Your iPhone Shortcut texts these people at 9am on December mornings. Copy the list into the Shortcut&apos;s
        Text step, and copy it again now and then: new sign-ups join, and anyone who has opened all 12 drops off.
      </p>
      {people.length > 0 && (
        <ul className="st-texts">
          {people.map((p) => (
            <li key={p.slug}>
              <b>{p.name}</b>
              {p.finished ? (
                <span className="st-muted">opened all 12 🎉 (left off the list)</span>
              ) : p.subscriptions.length === 0 ? (
                <span className="st-muted">hasn&apos;t signed up yet</span>
              ) : (
                p.subscriptions.map((s) => (
                  <span key={s.channel}>
                    {s.channel === "sms" ? `📱 ${prettyPhone(s.address)}` : `✉️ ${s.address}`}
                  </span>
                ))
              )}
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="st-btn" onClick={copy} disabled={lines.length === 0}>
        {copied ? "Copied! ✓" : "📋 Copy list for Shortcut"}
      </button>
    </section>
  );
}
