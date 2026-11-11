import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import CopyLinkButton from "@/components/studio/CopyLinkButton";
import { NewCalendarForm } from "@/components/studio/forms";
import MorningTexts from "@/components/studio/MorningTexts";
import { requireStudio } from "@/lib/auth";
import { store } from "@/lib/store";
import { CAL_TZ, CAL_YEAR, season, TOTAL_ORNAMENTS } from "@/lib/time";
import { logout } from "./actions";

const when = new Intl.DateTimeFormat("en-US", { timeZone: CAL_TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function StudioHome() {
  return (
    <Suspense fallback={<main className="st-wrap st-muted">Warming up the cocoa…</main>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  await connection();
  await requireStudio();
  const calendars = await store.listCalendars();
  const activity = await Promise.all(calendars.map((c) => store.getActivity(c.id)));

  const now = new Date();
  const daysToGo = Math.ceil((new Date(`${CAL_YEAR}-12-01T00:00:00-08:00`).getTime() - now.getTime()) / 86_400_000);
  const s = season(now);
  const countdown =
    s === "before"
      ? `${daysToGo} day${daysToGo === 1 ? "" : "s"} until the trees light up`
      : s === "december"
        ? "Trees are open: one ornament a day"
        : "Every ornament is open now 🎄";

  const feed = calendars
    .flatMap((cal, i) => Object.entries(activity[i].reactions).map(([day, r]) => ({ cal, day: Number(day), r })))
    .filter(({ r }) => r.emoji || r.note || r.redeemed)
    .sort((a, b) => b.r.updatedAt.localeCompare(a.r.updatedAt))
    .slice(0, 10);

  return (
    <main className="st-wrap">
      <header className="st-top">
        <div>
          <p className="st-eyebrow">{process.env.FROM_NAME || "Tracy"}&apos;s</p>
          <h1>Advent Studio 🎄</h1>
          <p className="st-muted">{countdown}</p>
        </div>
        <form action={logout}>
          <button className="st-btn ghost">Log out</button>
        </form>
      </header>

      <section className="st-card">
        <h2>Start a new tree</h2>
        <NewCalendarForm />
      </section>

      <section>
        <h2 className="st-section-title">Trees ({calendars.length})</h2>
        {calendars.length === 0 && <p className="st-muted">No calendars yet. Make one above!</p>}
        <div className="st-cal-grid">
          {calendars.map((cal, i) => {
            const act = activity[i];
            const filled = new Set(cal.doors.map((d) => d.day));
            const opened = Object.keys(act.opens).length;
            return (
              <article key={cal.id} className="st-card st-cal-card">
                <div className="st-row space">
                  <h3>{cal.recipientName}</h3>
                  <span className={`st-pill${filled.size === TOTAL_ORNAMENTS ? " done" : ""}`}>
                    {filled.size === TOTAL_ORNAMENTS ? "✓ all 12 filled" : `${filled.size}/12 filled`}
                  </span>
                </div>
                <div className="st-dots" aria-hidden="true">
                  {Array.from({ length: TOTAL_ORNAMENTS }, (_, d) => (
                    <i key={d} className={`${filled.has(d + 1) ? "f" : ""}${act.opens[d + 1] ? " o" : ""}`} />
                  ))}
                </div>
                <p className="st-muted small">
                  {opened}/12 opened · {act.subscriptions.length ? "🔔 reminders on" : "no reminders yet"}
                </p>
                <div className="st-row">
                  <Link className="st-btn" href={`/studio/${cal.id}`}>
                    Fill ornaments
                  </Link>
                  <CopyLinkButton slug={cal.slug} />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <MorningTexts
        people={calendars.map((cal, i) => ({
          name: cal.recipientName,
          slug: cal.slug,
          subscriptions: activity[i].subscriptions,
          finished: Object.keys(activity[i].opens).length >= TOTAL_ORNAMENTS,
        }))}
      />

      <section className="st-card">
        <h2>💌 From your people</h2>
        {feed.length === 0 ? (
          <p className="st-muted">Reactions and notes will show up here once doors start opening.</p>
        ) : (
          <ul className="st-feed">
            {feed.map(({ cal, day, r }) => (
              <li key={`${cal.id}-${day}`}>
                <Link href={`/studio/${cal.id}`}>
                  <b>{cal.recipientName}</b> · Ornament {day} {r.emoji} {r.redeemed && "🎟️ redeemed"}
                  {r.note && <q>{r.note}</q>}
                  <span className="st-muted small">{when.format(new Date(r.updatedAt))}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
