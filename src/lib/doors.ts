import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./auth";
import { store } from "./store";
import { pacificDay, resolveNow, season, TOTAL_ORNAMENTS } from "./time";
import type { Calendar, Door, LockReason, PublicDoorResponse, Reaction } from "./types";

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export const isDev = process.env.NODE_ENV !== "production";

/** First-open time of each ornament (day number -> ISO timestamp). */
export type Opens = Record<number, string>;

/** Has a new ornament already been opened today (Pacific time)? */
export function openedToday(opens: Opens, now: Date): boolean {
  const today = pacificDay(now);
  return Object.values(opens).some((at) => pacificDay(new Date(at)) === today);
}

/**
 * Why an ornament can't be opened right now, or null if it can. Opened ornaments
 * stay open. The studio owner's previews skip the one-a-day rule (they aren't recorded).
 */
export function lockReason(day: number, opens: Opens, now: Date, owner: boolean): LockReason | null {
  const s = season(now);
  if (s === "before") return "not_yet";
  if (s === "all_open" || owner || opens[day]) return null;
  return openedToday(opens, now) ? "one_a_day" : null;
}

/**
 * Loads the calendar and checks the ornament can be opened. This is the "no peeking"
 * guarantee: every ornament endpoint goes through here, on the server.
 * `owner` is true when the studio owner is previewing; callers must not record
 * opens, solves or reactions for owner visits. `now` is the (possibly pretend) time
 * to record an open at.
 */
export async function guardDoor(
  req: NextRequest,
  params: Promise<{ slug: string; day: string }>,
): Promise<{ cal: Calendar; day: number; owner: boolean; now: Date } | Response> {
  const { slug, day: dayParam } = await params;
  const day = Number(dayParam);
  if (!Number.isInteger(day) || day < 1 || day > TOTAL_ORNAMENTS) return json({ error: "bad_day" }, 400);

  const cal = await store.getCalendarBySlug(slug);
  if (!cal) return json({ error: "not_found" }, 404);

  const owner = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  const now = resolveNow(req.nextUrl.searchParams.get("now"), isDev || owner);
  const reason = lockReason(day, await store.getOpens(cal.id), now, owner);
  if (reason) return json({ error: "locked", reason, day }, 423);
  return { cal, day, owner, now };
}

export function toPublicDoor(day: number, door: Door | undefined, riddleSolved: boolean, reaction: Reaction | null): PublicDoorResponse {
  if (!door) return { day, content: { kind: "empty" }, reaction };
  const c = door.content;
  const content =
    c.kind === "riddle"
      ? { kind: "riddle" as const, question: c.question, ...(riddleSolved ? { prize: c.prize } : {}) }
      : c;
  return { day, note: door.note, content, reaction };
}
