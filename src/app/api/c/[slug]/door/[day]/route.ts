import type { NextRequest } from "next/server";
import { guardDoor, json, toPublicDoor } from "@/lib/doors";
import { store } from "@/lib/store";

/** Returns an unlocked door's contents, or 423 Locked. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/c/[slug]/door/[day]">) {
  const guard = await guardDoor(req, ctx.params);
  if (guard instanceof Response) return guard;
  const { cal, day, owner } = guard;

  if (!owner) await store.recordOpen(cal.id, day); // your previews don't count as opens
  const [solved, reaction] = await Promise.all([store.isRiddleSolved(cal.id, day), store.getReaction(cal.id, day)]);
  return json(toPublicDoor(day, cal.doors.find((d) => d.day === day), solved, reaction));
}
