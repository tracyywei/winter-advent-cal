import type { NextRequest } from "next/server";
import { answerMatches } from "@/lib/answers";
import { guardDoor, json } from "@/lib/doors";
import { store } from "@/lib/store";

/** Checks a riddle answer on the server; only a correct answer reveals the prize. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/c/[slug]/door/[day]/solve">) {
  const guard = await guardDoor(req, ctx.params);
  if (guard instanceof Response) return guard;
  const { cal, day, owner } = guard;

  const door = cal.doors.find((d) => d.day === day);
  if (door?.content.kind !== "riddle") return json({ error: "not_a_riddle" }, 400);

  const body = (await req.json().catch(() => null)) as { answer?: unknown } | null;
  const correct = typeof body?.answer === "string" && answerMatches(body.answer.slice(0, 200), door.content.answers);

  if (!correct) return json({ correct: false });
  if (!owner) await store.markRiddleSolved(cal.id, day);
  return json({ correct: true, prize: door.content.prize });
}
