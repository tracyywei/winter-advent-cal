import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import Village from "@/components/village/Village";
import "@/components/village/village.css";
import { isStudioAuthed } from "@/lib/auth";
import { isDev, openedToday } from "@/lib/doors";
import { store } from "@/lib/store";
import { resolveNow, season } from "@/lib/time";

export const metadata: Metadata = {
  title: "Your Advent Tree 🎄",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#14153d" };

export default function CalendarPage({ params, searchParams }: PageProps<"/c/[slug]">) {
  return (
    <Suspense
      fallback={
        <div className="va va-loading">
          <span>❄️</span>
        </div>
      }
    >
      <CalendarLoader params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function CalendarLoader({ params, searchParams }: PageProps<"/c/[slug]">) {
  await connection(); // Always render per request: which ornaments can open depends on the date.
  const [{ slug }, query, owner] = await Promise.all([params, searchParams, isStudioAuthed()]);
  const cal = await store.getCalendarBySlug(slug);
  if (!cal) notFound();

  // Pretend dates (?now=) work in development and for the signed-in studio owner only.
  const nowOverride = (isDev || owner) && typeof query.now === "string" ? query.now : null;

  const now = resolveNow(nowOverride, isDev || owner);
  const opens = await store.getOpens(cal.id);

  return (
    <Village
      slug={cal.slug}
      recipientName={cal.recipientName}
      fromName={cal.fromName}
      season={season(now)}
      openedDays={Object.keys(opens).map(Number)}
      usedToday={!owner && openedToday(opens, now)}
      nowOverride={nowOverride}
      preview={owner}
    />
  );
}
