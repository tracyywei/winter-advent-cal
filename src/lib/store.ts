import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { supabase } from "./supabase";
import type { Calendar, Door, DoorContent, Reaction, Subscription } from "./types";

/** All reads and writes go through here, to Supabase Postgres (see supabase/schema.sql). */

export type CalendarActivity = {
  /** day → ISO time the recipient first opened it */
  opens: Record<number, string>;
  reactions: Record<number, Reaction>;
  subscriptions: Subscription[];
};

type CalendarRow = {
  id: string;
  slug: string;
  recipient_name: string;
  from_name: string;
  doors?: { day: number; content: DoorContent; note: string | null }[];
};

const CAL_COLUMNS = "id, slug, recipient_name, from_name, doors(day, content, note)";

/** supabase-js returns errors instead of throwing; turn them into exceptions. */
function check<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`Supabase ${what} failed: ${res.error.message}`);
  return res.data;
}

/** Same, for queries that return a list (never null). */
function list<T>(res: { data: T[] | null; error: { message: string } | null }, what: string): T[] {
  return check(res, what) ?? [];
}

function toCalendar(row: CalendarRow): Calendar {
  return {
    id: row.id,
    slug: row.slug,
    recipientName: row.recipient_name,
    fromName: row.from_name,
    doors: (row.doors ?? [])
      .map((d): Door => ({ day: d.day, content: d.content, ...(d.note ? { note: d.note } : {}) }))
      .sort((a, b) => a.day - b.day),
  };
}

type ReactionRow = { day: number; emoji: string | null; note: string | null; redeemed: boolean | null; updated_at: string };

function toReaction(r: ReactionRow): Reaction {
  return {
    ...(r.emoji ? { emoji: r.emoji } : {}),
    ...(r.note ? { note: r.note } : {}),
    ...(r.redeemed ? { redeemed: true } : {}),
    updatedAt: r.updated_at,
  };
}

/** Secret link slug, e.g. "sam-q3Zr8xK1vY2bN0aM" (96 random bits, unguessable). */
function makeSlug(name: string) {
  const base =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 20) || "friend";
  return `${base}-${randomBytes(12).toString("base64url")}`;
}

const db = () => supabase();

export const store = {
  // ── Recipient side ──
  async getCalendarBySlug(slug: string): Promise<Calendar | null> {
    const row = check(await db().from("calendars").select(CAL_COLUMNS).eq("slug", slug).maybeSingle(), "load calendar");
    return row ? toCalendar(row as CalendarRow) : null;
  },

  async getOpenedDays(calendarId: string): Promise<number[]> {
    const rows = list(await db().from("opens").select("day").eq("calendar_id", calendarId), "load opens");
    return rows.map((r) => r.day as number);
  },

  async recordOpen(calendarId: string, day: number) {
    // Keeps the first open time: a second open is ignored.
    check(
      await db().from("opens").upsert({ calendar_id: calendarId, day }, { onConflict: "calendar_id,day", ignoreDuplicates: true }),
      "record open",
    );
  },

  async isRiddleSolved(calendarId: string, day: number): Promise<boolean> {
    const row = check(
      await db().from("solved_riddles").select("day").eq("calendar_id", calendarId).eq("day", day).maybeSingle(),
      "load riddle",
    );
    return Boolean(row);
  },

  async markRiddleSolved(calendarId: string, day: number) {
    check(
      await db()
        .from("solved_riddles")
        .upsert({ calendar_id: calendarId, day }, { onConflict: "calendar_id,day", ignoreDuplicates: true }),
      "save riddle",
    );
  },

  async getReaction(calendarId: string, day: number): Promise<Reaction | null> {
    const row = check(
      await db()
        .from("reactions")
        .select("day, emoji, note, redeemed, updated_at")
        .eq("calendar_id", calendarId)
        .eq("day", day)
        .maybeSingle(),
      "load reaction",
    );
    return row ? toReaction(row as ReactionRow) : null;
  },

  async saveReaction(calendarId: string, day: number, reaction: Reaction) {
    check(
      await db().from("reactions").upsert(
        {
          calendar_id: calendarId,
          day,
          emoji: reaction.emoji ?? null,
          note: reaction.note ?? null,
          redeemed: reaction.redeemed ?? null,
          updated_at: reaction.updatedAt,
        },
        { onConflict: "calendar_id,day" },
      ),
      "save reaction",
    );
  },

  async saveSubscription(calendarId: string, sub: Subscription) {
    check(
      await db().from("subscriptions").upsert(
        { calendar_id: calendarId, channel: sub.channel, address: sub.address, consented_at: sub.consentedAt, opted_out_at: null },
        { onConflict: "calendar_id,channel" },
      ),
      "save subscription",
    );
  },

  // ── Studio side ──
  async listCalendars(): Promise<Calendar[]> {
    const rows = list(await db().from("calendars").select(CAL_COLUMNS).order("created_at"), "list calendars");
    return (rows as CalendarRow[]).map(toCalendar);
  },

  async getCalendar(id: string): Promise<Calendar | null> {
    const row = check(await db().from("calendars").select(CAL_COLUMNS).eq("id", id).maybeSingle(), "load calendar");
    return row ? toCalendar(row as CalendarRow) : null;
  },

  async createCalendar({ recipientName, fromName }: { recipientName: string; fromName: string }): Promise<Calendar> {
    const cal: Calendar = { id: `cal_${randomUUID()}`, slug: makeSlug(recipientName), recipientName, fromName, doors: [] };
    check(
      await db().from("calendars").insert({ id: cal.id, slug: cal.slug, recipient_name: recipientName, from_name: fromName }),
      "create calendar",
    );
    return cal;
  },

  async updateCalendar(id: string, patch: { recipientName?: string; fromName?: string }) {
    const row: Record<string, string> = {};
    if (patch.recipientName !== undefined) row.recipient_name = patch.recipientName;
    if (patch.fromName !== undefined) row.from_name = patch.fromName;
    if (Object.keys(row).length) check(await db().from("calendars").update(row).eq("id", id), "rename calendar");
  },

  async deleteCalendar(id: string) {
    // Doors, opens, reactions and subscriptions go with it (ON DELETE CASCADE).
    check(await db().from("calendars").delete().eq("id", id), "delete calendar");
  },

  async saveDoor(calendarId: string, door: Door) {
    check(
      await db().from("doors").upsert(
        { calendar_id: calendarId, day: door.day, content: door.content, note: door.note ?? null, updated_at: new Date().toISOString() },
        { onConflict: "calendar_id,day" },
      ),
      "save door",
    );
    // Editing a riddle resets whether it was solved.
    check(await db().from("solved_riddles").delete().eq("calendar_id", calendarId).eq("day", door.day), "reset riddle");
  },

  async clearDoor(calendarId: string, day: number) {
    check(await db().from("doors").delete().eq("calendar_id", calendarId).eq("day", day), "clear door");
  },

  async getActivity(calendarId: string): Promise<CalendarActivity> {
    const [opens, reactions, subs] = await Promise.all([
      db().from("opens").select("day, first_opened_at").eq("calendar_id", calendarId),
      db().from("reactions").select("day, emoji, note, redeemed, updated_at").eq("calendar_id", calendarId),
      db().from("subscriptions").select("channel, address, consented_at").eq("calendar_id", calendarId).is("opted_out_at", null),
    ]);
    const activity: CalendarActivity = { opens: {}, reactions: {}, subscriptions: [] };
    for (const o of list(opens, "load opens")) activity.opens[o.day] = o.first_opened_at;
    for (const r of list(reactions, "load reactions") as ReactionRow[]) activity.reactions[r.day] = toReaction(r);
    activity.subscriptions = list(subs, "load subscriptions").map(
      (s): Subscription => ({ channel: s.channel, address: s.address, consentedAt: s.consented_at }),
    );
    return activity;
  },
};
