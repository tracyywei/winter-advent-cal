import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import Village from "@/components/village/Village";
import "@/components/village/village.css";
import { isStudioAuthed } from "@/lib/auth";
import { isDev } from "@/lib/doors";
import { store } from "@/lib/store";
import { resolveNow, unlockedThrough } from "@/lib/time";

export const metadata: Metadata = {
  title: "Your Advent Village 🎄",
  robots: { index: false, follow: false },
};

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
  await connection(); // Always render per request: which doors are open depends on the date.
  const [{ slug }, query, owner] = await Promise.all([params, searchParams, isStudioAuthed()]);
  const cal = await store.getCalendarBySlug(slug);
  if (!cal) notFound();

  // Pretend dates (?now=) work in development and for the signed-in studio owner only.
  const nowOverride = (isDev || owner) && typeof query.now === "string" ? query.now : null;

  return (
    <Village
      slug={cal.slug}
      recipientName={cal.recipientName}
      fromName={cal.fromName}
      unlockedThrough={unlockedThrough(resolveNow(nowOverride, isDev || owner))}
      openedDays={await store.getOpenedDays(cal.id)}
      nowOverride={nowOverride}
      preview={owner}
    />
  );
}
