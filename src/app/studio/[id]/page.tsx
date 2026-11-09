import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import CalendarEditor from "@/components/studio/CalendarEditor";
import { requireStudio } from "@/lib/auth";
import { store } from "@/lib/store";

export default function EditCalendarPage({ params }: PageProps<"/studio/[id]">) {
  return (
    <Suspense fallback={<main className="st-wrap st-muted">Opening the workshop…</main>}>
      <EditorLoader params={params} />
    </Suspense>
  );
}

async function EditorLoader({ params }: Pick<PageProps<"/studio/[id]">, "params">) {
  await connection();
  await requireStudio();
  const { id } = await params;
  const calendar = await store.getCalendar(id);
  if (!calendar) notFound();
  const activity = await store.getActivity(id);
  return <CalendarEditor calendar={calendar} activity={activity} />;
}
