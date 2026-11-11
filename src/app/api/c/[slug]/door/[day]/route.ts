import type { NextRequest } from "next/server";
import { guardDoor, json, toPublicDoor } from "@/lib/doors";
import { store } from "@/lib/store";

/** Returns an ornament's contents (recording the first open), or 423 Locked. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/c/[slug]/door/[day]">) {
  const guard = await guardDoor(req, ctx.params);
  if (guard instanceof Response) return guard;
  const { cal, day, owner, now } = guard;

  const door = cal.doors.find((d) => d.day === day);
  // Your previews don't count as opens, and an ornament you haven't filled yet doesn't use up their day.
  if (!owner && door) await store.recordOpen(cal.id, day, now);
  const [solved, reaction] = await Promise.all([store.isRiddleSolved(cal.id, day), store.getReaction(cal.id, day)]);
  return json(toPublicDoor(day, door, solved, reaction));
}
