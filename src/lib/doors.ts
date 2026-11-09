import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./auth";
import { store } from "./store";
import { isUnlocked, resolveNow, TOTAL_DAYS } from "./time";
import type { Calendar, Door, PublicDoorResponse, Reaction } from "./types";

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export const isDev = process.env.NODE_ENV !== "production";

/**
 * Loads the calendar and checks the door is unlocked. This is the "no peeking"
 * guarantee: every door endpoint goes through here, on the server.
 * `owner` is true when the studio owner is previewing; callers must not record
 * opens, solves or reactions for owner visits.
 */
export async function guardDoor(
  req: NextRequest,
  params: Promise<{ slug: string; day: string }>,
): Promise<{ cal: Calendar; day: number; owner: boolean } | Response> {
  const { slug, day: dayParam } = await params;
  const day = Number(dayParam);
  if (!Number.isInteger(day) || day < 1 || day > TOTAL_DAYS) return json({ error: "bad_day" }, 400);

  const cal = await store.getCalendarBySlug(slug);
  if (!cal) return json({ error: "not_found" }, 404);

  const owner = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  const now = resolveNow(req.nextUrl.searchParams.get("now"), isDev || owner);
  if (!isUnlocked(day, now)) return json({ error: "locked", day }, 423);
  return { cal, day, owner };
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
