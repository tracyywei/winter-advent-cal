"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { ALL_OPEN_DAY, CAL_YEAR, TOTAL_ORNAMENTS, type Season } from "@/lib/time";
import type { PublicDoorResponse } from "@/lib/types";
import "./village.css";
import { postJSON, type Api, type Post } from "./DoorBody";
import DoorReveal, { LOCK_TOAST, type LoadDoor } from "./DoorReveal";
import ReminderSheet from "./ReminderSheet";
import Snow from "./Snow";
import { ORNAMENT_SPOTS, Ornament, TreeArt, type OrnamentState } from "./tree";
import { useToast } from "./useToast";

type TreeProps = {
  slug: string;
  recipientName: string;
  fromName: string;
  /** Computed on the server: before December, during it, or from Dec 31 when everything is open. */
  season: Season;
  openedDays: number[];
  /** They already opened a new ornament today, so the others wait until tomorrow. */
  usedToday: boolean;
  /** Pretend date (dev or owner preview), forwarded to API calls so they agree with the page. */
  nowOverride: string | null;
  /** The studio owner is looking: show the preview bar. Visits aren't recorded. */
  preview?: boolean;
};

// Deterministic star field so server and client markup match.
const STARS = (() => {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: 46 }, () => ({ big: rnd() > 0.85, left: rnd() * 100, top: rnd() * 100, delay: rnd() * 3 }));
})();

const PRETEND_DAYS = [
  { value: `${CAL_YEAR}-11-30`, label: "Nov 30 (before)" },
  ...Array.from({ length: ALL_OPEN_DAY }, (_, i) => ({
    value: `${CAL_YEAR}-12-${String(i + 1).padStart(2, "0")}`,
    label: i + 1 === ALL_OPEN_DAY ? `Dec ${i + 1} (all open)` : `Dec ${i + 1}`,
  })),
];

export default function Village({ slug, recipientName, fromName, season, openedDays, usedToday: usedTodayInitial, nowOverride, preview }: TreeProps) {
  const [opened, setOpened] = useState(() => new Set(openedDays));
  const [usedToday, setUsedToday] = useState(usedTodayInitial);
  const [openN, setOpenN] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [wiggle, setWiggle] = useState<{ n: number; times: number } | null>(null);
  const opensNew = useRef(false);
  const { toast, toastEl } = useToast();

  const api = useCallback<Api>(
    (path) => `/api/c/${encodeURIComponent(slug)}${path}${nowOverride ? `?now=${encodeURIComponent(nowOverride)}` : ""}`,
    [slug, nowOverride],
  );
  const post = useCallback<Post>((path, body) => postJSON(api(path), body), [api]);
  const load = useCallback<LoadDoor>(
    async (n) => {
      const res = await fetch(api(`/door/${n}`), { cache: "no-store" });
      if (res.status === 423) {
        const body = (await res.json().catch(() => ({}))) as { reason?: keyof typeof LOCK_TOAST };
        return { locked: body.reason ?? "not_yet" };
      }
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as PublicDoorResponse;
    },
    [api],
  );
  const markOpened = useCallback(
    (n: number) => {
      setOpened((prev) => new Set(prev).add(n));
      // Opening a new one uses up today's ornament (your previews don't count).
      if (opensNew.current && season === "december" && !preview) setUsedToday(true);
    },
    [season, preview],
  );
  const closeOrnament = useCallback(() => setOpenN(null), []);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const lockedFor = (n: number) =>
    opened.has(n) || season === "all_open" ? null : season === "before" ? "not_yet" : usedToday ? "one_a_day" : null;

  const stateOf = (n: number): OrnamentState => (opened.has(n) ? "opened" : lockedFor(n) ? "locked" : "ready");

  const onOrnament = (n: number) => {
    const reason = lockedFor(n);
    if (reason) {
      setWiggle({ n, times: (wiggle?.times ?? 0) + 1 });
      toast(LOCK_TOAST[reason]);
      return;
    }
    opensNew.current = !opened.has(n);
    setOpenN(n);
  };

  const finished = opened.size >= TOTAL_ORNAMENTS;
  const status = finished
    ? "You opened all 12! Merry Christmas 🎄"
    : season === "before"
      ? "Your tree lights up December 1 ❄️ Then open one ornament a day, any one you like."
      : season === "all_open"
        ? "Every ornament is open now. Catch up on any you missed ✨"
        : usedToday
          ? "That's today's ornament! Come back tomorrow for another ✨"
          : "Pick any ornament to open today ✨ (one a day)";

  return (
    <div className="va">
      {preview && (
        <div className="va-preview-bar">
          <span>👀 Preview: {recipientName} won&apos;t see this visit.</span>
          <label>
            Pretend it&apos;s{" "}
            <select value={nowOverride ?? ""} onChange={(e) => window.location.assign(e.target.value ? `?now=${e.target.value}` : "?")}>
              <option value="">today</option>
              {PRETEND_DAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <Link href="/studio">← Studio</Link>
        </div>
      )}
      <div className="va-sky" aria-hidden="true">
        {STARS.map((s, i) => (
          <i key={i} className={`va-star${s.big ? " big" : ""}`} style={{ left: `${s.left}%`, top: `${s.top}%`, animationDelay: `${s.delay}s` }} />
        ))}
      </div>
      <Snow />

      <div className="va-col">
        <header className="va-hero">
          <div className="va-moon" aria-hidden="true" />
          <p className="va-eyebrow">from {fromName}, with love</p>
          <h1>{recipientName}&apos;s Advent Tree</h1>
          <p className="va-status">{status}</p>
          <div className="va-progress">
            <div className="bar">
              <span style={{ width: `${(opened.size / TOTAL_ORNAMENTS) * 100}%` }} />
            </div>
            <span>
              {opened.size}/{TOTAL_ORNAMENTS} opened
            </span>
          </div>
          {season !== "all_open" && !finished && (
            <button type="button" className="va-bell" onClick={() => setSheetOpen(true)}>
              🔔 Get a morning text
            </button>
          )}
        </header>

        <main className="va-tree">
          <TreeArt finished={finished} />
          {ORNAMENT_SPOTS.map(([x, y], i) => {
            const n = i + 1;
            const st = stateOf(n);
            const wiggling = wiggle?.n === n;
            return (
              <button
                key={n}
                type="button"
                className={`va-orn ${st}${wiggling ? " wiggle" : ""}`}
                style={{ left: `${(x / 300) * 100}%`, top: `${(y / 420) * 100}%` }}
                onClick={() => onOrnament(n)}
                aria-label={st === "opened" ? `Ornament ${n}, opened` : st === "locked" ? `Ornament ${n}, not yet` : `Open ornament ${n}`}
              >
                {/* Re-keying restarts the wiggle animation on repeated taps. */}
                <span className="art" key={wiggling ? wiggle.times : 0}>
                  <Ornament n={n} state={st} />
                </span>
              </button>
            );
          })}
        </main>
      </div>
      <div className="va-snowbank" />

      <p className="va-foot">
        made with ♥ by {fromName} · December {CAL_YEAR}
      </p>

      {openN !== null && (
        <DoorReveal
          key={openN}
          day={openN}
          load={load}
          post={post}
          firstTime={!opened.has(openN)}
          fromName={fromName}
          toast={toast}
          onOpened={markOpened}
          onClose={closeOrnament}
        />
      )}
      {sheetOpen && <ReminderSheet api={api} slug={slug} recipientName={recipientName} fromName={fromName} onClose={closeSheet} />}
      {toastEl}
    </div>
  );
}
