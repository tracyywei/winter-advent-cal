import type { NextRequest } from "next/server";
import { guardDoor, json } from "@/lib/doors";
import { store } from "@/lib/store";
import { MAX_NOTE_LENGTH, REACTION_EMOJIS, type Reaction } from "@/lib/types";

/** Saves the recipient's emoji, note back to the sender, or coupon "redeemed" flag. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/c/[slug]/door/[day]/react">) {
  const guard = await guardDoor(req, ctx.params);
  if (guard instanceof Response) return guard;
  const { cal, day, owner } = guard;
  if (owner) return json({ ok: true, preview: true }); // previews never save reactions

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ error: "bad_body" }, 400);

  const next: Reaction = { ...(await store.getReaction(cal.id, day)), updatedAt: new Date().toISOString() };

  if ("emoji" in body) {
    if (body.emoji === "" || body.emoji === null) delete next.emoji;
    else if ((REACTION_EMOJIS as readonly unknown[]).includes(body.emoji)) next.emoji = body.emoji as string;
    else return json({ error: "bad_emoji" }, 400);
  }
  if ("note" in body) {
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (!note || note.length > MAX_NOTE_LENGTH) return json({ error: "bad_note" }, 400);
    next.note = note;
  }
  if ("redeemed" in body) next.redeemed = body.redeemed === true;

  await store.saveReaction(cal.id, day, next);
  return json({ ok: true, reaction: next });
}
