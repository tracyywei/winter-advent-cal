"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { assertStudio, endSession, passwordMatches, startSession } from "@/lib/auth";
import { createUpload as makeUpload, type MediaKind } from "@/lib/media";
import { store } from "@/lib/store";
import { TOTAL_DAYS } from "@/lib/time";
import { MAX_NOTE_LENGTH } from "@/lib/types";
import { parseDoorContent } from "@/lib/validate";

type FormState = { error?: string } | undefined;

const name = (v: unknown, max = 40) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  if (!passwordMatches(String(form.get("password") ?? ""))) {
    await new Promise((r) => setTimeout(r, 700)); // slow down guessing
    return { error: "That's not it 🙈" };
  }
  await startSession();
  redirect("/studio");
}

export async function logout() {
  await endSession();
  redirect("/studio/login");
}

export async function createCalendar(_prev: FormState, form: FormData): Promise<FormState> {
  await assertStudio();
  const recipientName = name(form.get("recipientName"));
  if (!recipientName) return { error: "Who's this calendar for?" };
  const cal = await store.createCalendar({ recipientName, fromName: process.env.FROM_NAME || "Tracy" });
  redirect(`/studio/${cal.id}`);
}

export async function updateNames(calendarId: string, recipientName: string, fromName: string) {
  await assertStudio();
  const r = name(recipientName);
  const f = name(fromName);
  if (!r || !f) return { ok: false as const, error: "Names can't be empty" };
  await store.updateCalendar(calendarId, { recipientName: r, fromName: f });
  refresh();
  return { ok: true as const };
}

export async function deleteCalendar(calendarId: string) {
  await assertStudio();
  await store.deleteCalendar(calendarId);
  redirect("/studio");
}

export async function saveDoor(calendarId: string, day: number, content: unknown, note: string) {
  await assertStudio();
  if (!Number.isInteger(day) || day < 1 || day > TOTAL_DAYS) return { ok: false as const, error: "Bad day" };
  const parsed = parseDoorContent(content);
  if (!parsed.ok) return { ok: false as const, error: parsed.error };
  const cleanNote = typeof note === "string" ? note.trim().slice(0, MAX_NOTE_LENGTH * 2) : "";
  await store.saveDoor(calendarId, { day, content: parsed.value, ...(cleanNote ? { note: cleanNote } : {}) });
  refresh();
  return { ok: true as const };
}

export async function clearDoor(calendarId: string, day: number) {
  await assertStudio();
  await store.clearDoor(calendarId, day);
  refresh();
  return { ok: true as const };
}

/** Step 1 of an upload: get somewhere to send the file. The browser then PUTs it there directly. */
export async function createUpload(kind: MediaKind, contentType: string, size: number) {
  await assertStudio();
  return await makeUpload(kind, contentType, size);
}
