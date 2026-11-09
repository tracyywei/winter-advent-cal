"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteCalendar, updateNames } from "@/app/studio/actions";
import type { CalendarActivity } from "@/lib/store";
import { CAL_YEAR, TOTAL_DAYS } from "@/lib/time";
import type { Calendar } from "@/lib/types";
import { useToast } from "../village/useToast";
import CopyLinkButton, { useOrigin } from "./CopyLinkButton";
import DoorEditor from "./DoorEditor";
import { KIND_EMOJI } from "./drafts";

type Props = { calendar: Calendar; activity: CalendarActivity };

export default function CalendarEditor({ calendar, activity }: Props) {
  const doors = new Map(calendar.doors.map((d) => [d.day, d]));
  const firstEmpty = Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).find((d) => !doors.has(d)) ?? 1;
  const [day, setDay] = useState(firstEmpty);
  const dirty = useRef(false);
  const editorRef = useRef<HTMLElement>(null);
  const { toast, toastEl } = useToast();

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    addEventListener("beforeunload", onBeforeUnload);
    return () => removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const select = (d: number) => {
    if (d === day) return;
    if (dirty.current && !confirm(`You have unsaved changes on Dec ${day}. Discard them?`)) return;
    dirty.current = false;
    setDay(d);
    if (window.innerWidth < 900) requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <main className="st-wrap">
      <nav className="st-top">
        <Link href="/studio" className="st-back">
          ← All calendars
        </Link>
      </nav>

      <NamesHeader calendar={calendar} subscribed={activity.subscriptions.map((s) => s.channel)} />

      <div className="st-editor-layout">
        <section className="st-card st-doors">
          <h2>
            Doors <small>{calendar.doors.length}/25 filled</small>
          </h2>
          <div className="st-door-grid">
            {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map((d) => {
              const door = doors.get(d);
              const r = activity.reactions[d];
              return (
                <button
                  key={d}
                  type="button"
                  className={`st-tile${door ? " filled" : ""}${d === day ? " sel" : ""}`}
                  onClick={() => select(d)}
                  aria-label={`Dec ${d}${door ? "" : ", empty"}`}
                  aria-pressed={d === day}
                >
                  <span className="d">{d}</span>
                  <span className="k">{door ? KIND_EMOJI[door.content.kind] : "＋"}</span>
                  <span className="m">
                    {activity.opens[d] && "👀"}
                    {r?.emoji}
                    {r?.note && "💬"}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="st-hint">👀 opened · 💬 they left you a note</p>
        </section>

        <section className="st-card" ref={editorRef}>
          <DoorEditor
            key={day}
            calendarId={calendar.id}
            day={day}
            door={doors.get(day)}
            recipientName={calendar.recipientName}
            fromName={calendar.fromName}
            openedAt={activity.opens[day]}
            reaction={activity.reactions[day]}
            toast={toast}
            onDirtyChange={(v) => (dirty.current = v)}
          />
        </section>
      </div>

      <div className="va va-portal">{toastEl}</div>
    </main>
  );
}

function NamesHeader({ calendar, subscribed }: { calendar: Calendar; subscribed: string[] }) {
  const origin = useOrigin();
  const [editing, setEditing] = useState(false);
  const [recipientName, setRecipientName] = useState(calendar.recipientName);
  const [fromName, setFromName] = useState(calendar.fromName);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const saveNames = () =>
    startTransition(async () => {
      const r = await updateNames(calendar.id, recipientName, fromName);
      if (!r.ok) return setError(r.error);
      setError("");
      setEditing(false);
    });

  const remove = () => {
    const ok = confirm(`Delete ${calendar.recipientName}'s calendar and everything in it (doors, reactions, sign-ups)? This can't be undone.`);
    if (ok) startTransition(() => deleteCalendar(calendar.id));
  };

  return (
    <header className="st-card st-cal-head">
      {editing ? (
        <div className="st-row">
          <label className="st-field grow">
            <span className="st-label">For</span>
            <input className="st-input" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} maxLength={40} />
          </label>
          <label className="st-field grow">
            <span className="st-label">From</span>
            <input className="st-input" value={fromName} onChange={(e) => setFromName(e.target.value)} maxLength={40} />
          </label>
          <button type="button" className="st-btn" onClick={saveNames} disabled={pending}>
            Save
          </button>
          <button type="button" className="st-btn ghost" onClick={() => setEditing(false)}>
            Cancel
          </button>
          {error && <p className="st-error">{error}</p>}
        </div>
      ) : (
        <div className="st-row space">
          <div>
            <h1>{calendar.recipientName}&apos;s village</h1>
            <p className="st-muted">
              from {calendar.fromName} ·{" "}
              {subscribed.length ? `🔔 reminders on (${subscribed.join(" + ")})` : "no reminders yet"}{" "}
              <button type="button" className="st-link" onClick={() => setEditing(true)}>
                edit names
              </button>
            </p>
          </div>
        </div>
      )}

      <div className="st-linkbox">
        <code>
          {origin}/c/{calendar.slug}
        </code>
      </div>
      <div className="st-row">
        <CopyLinkButton slug={calendar.slug} className="st-btn" />
        <a className="st-btn soft" href={`/c/${calendar.slug}?now=${CAL_YEAR}-12-25`} target="_blank" rel="noreferrer">
          👀 Preview village
        </a>
        <button type="button" className="st-btn ghost danger-text" onClick={remove} disabled={pending}>
          Delete calendar
        </button>
      </div>
    </header>
  );
}
