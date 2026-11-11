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
