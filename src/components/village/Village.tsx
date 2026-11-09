"use client";

import Link from "next/link";
import { Fragment, useCallback, useState } from "react";
import { CAL_YEAR, TOTAL_DAYS } from "@/lib/time";
import type { PublicDoorResponse } from "@/lib/types";
import "./village.css";
import { postJSON, type Api, type Post } from "./DoorBody";
import DoorReveal, { type LoadDoor } from "./DoorReveal";
import { CuteHouse, CuteTree, type HouseState } from "./houses";
import ReminderSheet from "./ReminderSheet";
import Snow from "./Snow";
import { useToast } from "./useToast";

type VillageProps = {
  slug: string;
  recipientName: string;
  fromName: string;
  /** Highest door number unlocked right now, computed on the server. */
  unlockedThrough: number;
  openedDays: number[];
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

export default function Village({ slug, recipientName, fromName, unlockedThrough, openedDays, nowOverride, preview }: VillageProps) {
  const [opened, setOpened] = useState(() => new Set(openedDays));
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [wiggle, setWiggle] = useState<{ day: number; n: number } | null>(null);
  const { toast, toastEl } = useToast();

  const api = useCallback<Api>(
    (path) => `/api/c/${encodeURIComponent(slug)}${path}${nowOverride ? `?now=${encodeURIComponent(nowOverride)}` : ""}`,
    [slug, nowOverride],
  );
  const post = useCallback<Post>((path, body) => postJSON(api(path), body), [api]);
  const load = useCallback<LoadDoor>(
    async (day) => {
      const res = await fetch(api(`/door/${day}`), { cache: "no-store" });
      if (res.status === 423) return "locked";
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as PublicDoorResponse;
    },
    [api],
  );
  const markOpened = useCallback((day: number) => setOpened((prev) => new Set(prev).add(day)), []);
  const closeDoor = useCallback(() => setOpenDay(null), []);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const stateOf = (d: number): HouseState => (d > unlockedThrough ? "locked" : opened.has(d) ? "opened" : "ready");

  const onHouse = (d: number) => {
    if (d > unlockedThrough) {
      setWiggle({ day: d, n: (wiggle?.n ?? 0) + 1 });
      toast(`No peeking! 👀 Door ${d} opens Dec ${d}`);
      return;
    }
    setOpenDay(d);
  };

  const house = (d: number) => {
    const st = stateOf(d);
    const big = d === TOTAL_DAYS;
    const wiggling = wiggle?.day === d;
    return (
      <button
        key={d}
        type="button"
        className={`va-house ${st}${big ? " big" : ""}${wiggling ? " wiggle" : ""}`}
        onClick={() => onHouse(d)}
        aria-label={st === "locked" ? `Door ${d}, opens December ${d}` : `Open door ${d}`}
      >
        {/* Re-keying restarts the wiggle animation on repeated taps. */}
        <span className="art" key={wiggling ? wiggle.n : 0}>
          {big ? <CuteTree /> : <CuteHouse day={d} state={st} />}
        </span>
      </button>
    );
  };

  const todayOpened = unlockedThrough > 0 && opened.has(unlockedThrough);
  const status =
    unlockedThrough === 0
      ? "Your first door opens December 1 ❄️"
      : unlockedThrough >= TOTAL_DAYS
        ? "Merry Christmas! 🎄 Every door is open."
        : todayOpened
          ? `Come back tomorrow for door ${unlockedThrough + 1} ✨`
          : `Door ${unlockedThrough} is ready for you ✨`;
  const nextDay = Math.min(unlockedThrough + 1, TOTAL_DAYS);

  return (
    <div className="va">
      {preview && (
        <div className="va-preview-bar">
          <span>👀 Preview: {recipientName} won&apos;t see this visit.</span>
          <label>
            Pretend it&apos;s{" "}
            <select value={nowOverride ?? ""} onChange={(e) => window.location.assign(e.target.value ? `?now=${e.target.value}` : "?")}>
              <option value="">today</option>
              {Array.from({ length: TOTAL_DAYS }, (_, i) => {
                const d = `${CAL_YEAR}-12-${String(i + 1).padStart(2, "0")}`;
                return (
                  <option key={d} value={d}>
                    Dec {i + 1}
                  </option>
                );
              })}
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
          <h1>{recipientName}&apos;s Advent Village</h1>
          <p className="va-status">{status}</p>
          <div className="va-progress">
            <div className="bar">
              <span style={{ width: `${(opened.size / TOTAL_DAYS) * 100}%` }} />
            </div>
            <span>
              {opened.size}/{TOTAL_DAYS} opened
            </span>
          </div>
          {unlockedThrough < TOTAL_DAYS && (
            <button type="button" className="va-bell" onClick={() => setSheetOpen(true)}>
              🔔 Get a daily text
            </button>
          )}
        </header>

        <main>
          {[0, 1, 2, 3].map((r) => (
            <Fragment key={r}>
              <div className="va-row">{[1, 2, 3, 4, 5, 6].map((i) => house(r * 6 + i))}</div>
              <div className="va-ground" />
            </Fragment>
          ))}
          <div className="va-finale">{house(TOTAL_DAYS)}</div>
          <div className="va-ground last" />
        </main>
      </div>

      <p className="va-foot">
        made with ♥ by {fromName} · December {CAL_YEAR}
      </p>

      {openDay !== null && (
        <DoorReveal
          key={openDay}
          day={openDay}
          load={load}
          post={post}
          firstTime={!opened.has(openDay)}
          fromName={fromName}
          toast={toast}
          onOpened={markOpened}
          onClose={closeDoor}
        />
      )}
      {sheetOpen && (
        <ReminderSheet api={api} slug={slug} recipientName={recipientName} fromName={fromName} nextDay={nextDay} onClose={closeSheet} />
      )}
      {toastEl}
    </div>
  );
}
