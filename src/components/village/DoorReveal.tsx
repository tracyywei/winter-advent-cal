"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { LockReason, PublicDoorResponse } from "@/lib/types";
import DoorBody, { type Post } from "./DoorBody";
import { ornamentColors } from "./tree";
import type { Toast } from "./useToast";

type Particle = { id: string; dx: number; dy: number; r: number; delay: number; glyph: string; color: string; size: number };

const GLYPHS = ["✦", "❄", "♥", "✧", "★"];
const COLORS = ["#ffd66b", "#ff8fab", "#8fd3ff", "#ffffff", "#9be3b4"];

function makeBurst(): Particle[] {
  return Array.from({ length: 22 }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 110 + Math.random() * 120;
    return {
      id: `${Date.now()}-${i}`,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      r: Math.random() * 360,
      delay: Math.random() * 0.15,
      glyph: GLYPHS[i % GLYPHS.length],
      color: COLORS[i % COLORS.length],
      size: 14 + Math.random() * 14,
    };
  });
}

/** Loads an ornament's contents, or why the server says it can't open yet. Must be a stable function. */
export type LoadDoor = (day: number) => Promise<PublicDoorResponse | { locked: LockReason }>;

export const LOCK_TOAST: Record<LockReason, string> = {
  not_yet: "No peeking! 👀 Your tree opens December 1",
  one_a_day: "One a day! 🎁 Come back tomorrow for another",
};

type Props = {
  day: number;
  load: LoadDoor;
  post: Post;
  /** First time opening this ornament: the reveal is slower and more dramatic. */
  firstTime: boolean;
  fromName: string;
  toast: Toast;
  /** Called once contents arrive. Unfilled ornaments ("elves still wrapping") don't count as opened. */
  onOpened?: (day: number) => void;
  onClose: () => void;
};

export default function DoorReveal({ day, load, post, firstTime, fromName, toast, onOpened, onClose }: Props) {
  const [first] = useState(firstTime);
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<"loading" | "opening" | "open">("loading");
  const [door, setDoor] = useState<PublicDoorResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [burst, setBurst] = useState<Particle[]>([]);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setShow(false);
    window.setTimeout(onClose, 300);
  }, [onClose]);

  const celebrate = useCallback(() => {
    setBurst(makeBurst());
    window.setTimeout(() => setBurst([]), 1400);
  }, []);

  // Load the ornament; it only pops open once its contents have arrived.
  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];
    const started = performance.now();
    const raf = requestAnimationFrame(() => {
      setShow(true);
      closeBtn.current?.focus();
    });

    const swing = () => {
      const wait = Math.max(0, (first ? 700 : 300) - (performance.now() - started));
      timers.push(window.setTimeout(() => {
        setPhase("opening");
        setBurst(makeBurst());
      }, wait));
      timers.push(window.setTimeout(() => setPhase("open"), wait + 1000));
      timers.push(window.setTimeout(() => setBurst([]), wait + 1500));
    };

    load(day)
      .then((result) => {
        if (cancelled) return;
        if ("locked" in result) {
          toast(LOCK_TOAST[result.locked]);
          close();
          return;
        }
        setDoor(result);
        if (result.content.kind !== "empty") onOpened?.(day);
        swing();
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        swing();
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [load, day, first, toast, close, onOpened]);

  // Lock page scroll and close on Escape while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      removeEventListener("keydown", onKey);
    };
  }, [close]);

  const [c1, c2] = ornamentColors(day);
  const stageClass = ["va-stage", phase === "loading" && "loading", phase !== "loading" && "open", phase === "open" && "done"]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={`va-overlay${show ? " show" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Ornament ${day}`}
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className={stageClass}>
        <div className="va-card">
          {failed ? (
            <div className="va-elves">
              <div>🧝</div>
              <h3>Oops, the elves dropped this one</h3>
              <p className="va-small">Check your connection and try again.</p>
              <button type="button" className="va-btn" onClick={close}>
                Back to the tree
              </button>
            </div>
          ) : (
            door && <DoorBody door={door} post={post} toast={toast} fromName={fromName} celebrate={celebrate} />
          )}
        </div>

        <div className="va-bauble" aria-hidden="true" style={{ "--c1": c1, "--c2": c2 } as CSSProperties}>
          <div className="va-bauble-top">
            <div className="cap" />
            <div className="half" />
          </div>
          <div className="va-bauble-bot">
            <div className="half" />
          </div>
          <div className="va-bauble-label">
            <span>No.</span>
            <b>{day}</b>
          </div>
        </div>

        <div className="va-burst" aria-hidden="true">
          {burst.map((p) => (
            <span
              key={p.id}
              className="va-p"
              style={{ "--dx": `${p.dx}px`, "--dy": `${p.dy}px`, "--r": `${p.r}deg`, animationDelay: `${p.delay}s`, color: p.color, fontSize: p.size } as CSSProperties}
            >
              {p.glyph}
            </span>
          ))}
        </div>
      </div>

      <button ref={closeBtn} type="button" className="va-close" onClick={close} aria-label="Close">
        ✕
      </button>
    </div>
  );
}
