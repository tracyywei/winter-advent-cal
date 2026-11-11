"use client";

import { useActionState } from "react";
import { createCalendar, login } from "@/app/studio/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="st-login">
      <div className="st-login-emoji">🎄</div>
      <h1>Advent Studio</h1>
      <p className="st-muted">Where the elves fill the doors.</p>
      <label className="st-field">
        <span className="st-label">Password</span>
        <input className="st-input" name="password" type="password" autoComplete="current-password" autoFocus required />
      </label>
      {state?.error && <p className="st-error">{state.error}</p>}
      <button className="st-btn big" disabled={pending}>
        {pending ? "Checking…" : "Come on in"}
      </button>
    </form>
  );
}

export function NewCalendarForm() {
  const [state, action, pending] = useActionState(createCalendar, undefined);
  return (
    <form action={action} className="st-row">
      <input className="st-input grow" name="recipientName" placeholder="Who's it for? e.g. Mom" maxLength={40} required aria-label="Recipient name" />
      <button className="st-btn" disabled={pending}>
        {pending ? "Planting…" : "＋ New tree"}
      </button>
      {state?.error && <p className="st-error">{state.error}</p>}
    </form>
  );
}
