"use client";

import { useCallback, useState, useTransition } from "react";
import { clearDoor, saveDoor } from "@/app/studio/actions";
import { answerMatches } from "@/lib/answers";
import { CAL_TZ } from "@/lib/time";
import type { Door, PublicContent, PublicDoorResponse, Reaction, RiddleContent } from "@/lib/types";
import { parseDoorContent } from "@/lib/validate";
import type { Post } from "../village/DoorBody";
import DoorReveal, { type LoadDoor } from "../village/DoorReveal";
import type { Toast } from "../village/useToast";
import { DoorFields, KindPicker } from "./DoorFields";
import { fromDraft, toDraft, type Draft } from "./drafts";

const when = new Intl.DateTimeFormat("en-US", { timeZone: CAL_TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

type Props = {
  calendarId: string;
  day: number;
  door: Door | undefined;
  recipientName: string;
  fromName: string;
  openedAt?: string;
  reaction?: Reaction;
  toast: Toast;
  onDirtyChange: (dirty: boolean) => void;
};

export default function DoorEditor({ calendarId, day, door, recipientName, fromName, openedAt, reaction, toast, onDirtyChange }: Props) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(door?.content));
  const [note, setNote] = useState(door?.note ?? "");
  const [dirty, setDirtyState] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<{ door: PublicDoorResponse; riddle?: RiddleContent } | null>(null);

  const setDirty = (v: boolean) => {
    setDirtyState(v);
    onDirtyChange(v);
  };
  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError("");
    setDirty(true);
  };

  const save = () => {
    const parsed = parseDoorContent(fromDraft(draft)); // same check the server runs
    if (!parsed.ok) return setError(parsed.error);
    startTransition(async () => {
      const r = await saveDoor(calendarId, day, fromDraft(draft), note);
      if (!r.ok) return setError(r.error);
      setDirty(false);
      toast(`Saved Dec ${day} ✨`);
    });
  };

  const clear = () => {
    if (!confirm(`Empty door ${day}? Its contents will be removed.`)) return;
    startTransition(async () => {
      await clearDoor(calendarId, day);
      setDraft(toDraft(undefined));
      setNote("");
      setDirty(false);
      toast(`Emptied Dec ${day}`);
    });
  };

  const openPreview = () => {
    const parsed = parseDoorContent(fromDraft(draft));
    if (!parsed.ok) return setError(parsed.error);
    const c = parsed.value;
    const content: PublicContent = c.kind === "riddle" ? { kind: "riddle", question: c.question } : c;
    setPreview({
      door: { day, note: note.trim() || undefined, content, reaction: null },
      riddle: c.kind === "riddle" ? c : undefined,
    });
  };

  // The preview runs the real recipient door, with writes handled locally instead of sent.
  const load = useCallback<LoadDoor>(async () => preview!.door, [preview]);
  const post = useCallback<Post>(
    async <T,>(path: string, body: unknown) => {
      if (path.endsWith("/solve")) {
        const answer = (body as { answer?: string }).answer ?? "";
        const r = preview?.riddle;
        return (r && answerMatches(answer, r.answers) ? { correct: true, prize: r.prize } : { correct: false }) as T;
      }
      return { ok: true } as T;
    },
    [preview],
  );

  return (
    <div className="st-door-editor">
      <div className="st-door-head">
        <h2>
          Dec {day}
          {dirty && <span className="st-dirty">• unsaved</span>}
        </h2>
        <div className="st-activity">
          {openedAt ? <span>👀 Opened {when.format(new Date(openedAt))}</span> : <span className="st-muted">Not opened yet</span>}
          {reaction?.emoji && <span>Reacted {reaction.emoji}</span>}
          {reaction?.redeemed && <span>🎟️ Redeemed!</span>}
        </div>
        {reaction?.note && (
          <blockquote className="st-their-note">
            💬 “{reaction.note}” <cite>{recipientName}</cite>
          </blockquote>
        )}
      </div>

      <KindPicker value={draft.kind} onChange={(kind) => set({ kind })} />
      <div className="st-fields">
        <DoorFields d={draft} set={set} recipientName={recipientName} />
      </div>

      {draft.kind && (
        <label className="st-field">
          <span className="st-label">A little note from you (optional)</span>
          <textarea
            className="st-input"
            rows={2}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setDirty(true);
            }}
            placeholder="Shown in handwriting under the surprise"
          />
        </label>
      )}

      {error && <p className="st-error">{error}</p>}

      <div className="st-actions">
        <button type="button" className="st-btn" onClick={save} disabled={pending || !draft.kind}>
          {pending ? "Saving…" : "Save door"}
        </button>
        <button type="button" className="st-btn soft" onClick={openPreview} disabled={!draft.kind}>
          👀 Preview
        </button>
        {door && (
          <button type="button" className="st-btn ghost danger-text" onClick={clear} disabled={pending}>
            Empty door
          </button>
        )}
      </div>

      {preview && (
        <div className="va va-portal">
          <DoorReveal day={day} load={load} post={post} firstTime fromName={fromName} toast={toast} onClose={() => setPreview(null)} />
        </div>
      )}
    </div>
  );
}
