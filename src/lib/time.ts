/**
 * The tree's calendar: 12 ornaments, opened any time in December, at most one new
 * one per day (midnight to midnight Pacific). On Dec 31 every ornament unlocks so
 * late openers can catch up.
 */
export const CAL_TZ = "America/Los_Angeles";
export const CAL_YEAR = 2026;
export const TOTAL_ORNAMENTS = 12;
export const ALL_OPEN_DAY = 31;

export type Season = "before" | "december" | "all_open";

function pacificDate(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CAL_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** "2026-12-08": the Pacific calendar day, for "one ornament a day". */
export function pacificDay(now: Date): string {
  const { year, month, day } = pacificDate(now);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function season(now: Date): Season {
  const { year, month, day } = pacificDate(now);
  if (year > CAL_YEAR) return "all_open";
  if (year < CAL_YEAR || month < 12) return "before";
  return day >= ALL_OPEN_DAY ? "all_open" : "december";
}

/** Minutes `timeZone` is ahead of UTC at `at`. */
function offsetMinutes(timeZone: string, at: Date): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" })
      .formatToParts(at)
      .map((x) => [x.type, Number(x.value)]),
  );
  return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - at.getTime()) / 60000);
}

/**
 * The hour on Tracy's phone (Pacific time, 0–23) when it is 9am for someone in
 * `timeZone` during December. Unknown or missing zones get 9 (9am Pacific).
 * Half-hour zones round down to the hour before.
 */
export function sendHourFor(timeZone: string | undefined): number {
  if (!timeZone) return 9;
  try {
    const ref = new Date(Date.UTC(CAL_YEAR, 11, 10, 12));
    const diff = offsetMinutes(CAL_TZ, ref) - offsetMinutes(timeZone, ref); // how far Pacific is ahead of them
    return (((Math.floor((9 * 60 + diff) / 60) % 24) + 24) % 24);
  } catch {
    return 9;
  }
}

/** "6 AM", "1 PM" */
export const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;

/**
 * `?now=2026-12-07` pretends it is noon PT on that date. Only honored when
 * `trusted`: in development, or when the studio owner is signed in (preview).
 */
export function resolveNow(override: string | null | undefined, trusted: boolean): Date {
  if (trusted && override && /^\d{4}-\d{2}-\d{2}$/.test(override)) {
    return new Date(`${override}T12:00:00-08:00`);
  }
  return new Date();
}
