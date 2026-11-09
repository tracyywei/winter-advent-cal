/** All doors unlock at midnight Pacific time, for everyone. */
export const CAL_TZ = "America/Los_Angeles";
export const CAL_YEAR = 2026;
export const TOTAL_DAYS = 25;

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

/** The highest door number that is open right now (0 before Dec 1, 25 from Christmas on). */
export function unlockedThrough(now: Date): number {
  const { year, month, day } = pacificDate(now);
  if (year > CAL_YEAR) return TOTAL_DAYS;
  if (year < CAL_YEAR || month < 12) return 0;
  return Math.min(day, TOTAL_DAYS);
}

export function isUnlocked(day: number, now: Date): boolean {
  return Number.isInteger(day) && day >= 1 && day <= unlockedThrough(now);
}

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
