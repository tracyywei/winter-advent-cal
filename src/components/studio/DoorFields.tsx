"use client";

import { useState, type ReactNode } from "react";
import { songEmbed, youtubeId } from "@/lib/embeds";
import { emptyDraft, KINDS, type Draft, type DraftKind } from "./drafts";
import MediaField from "./MediaField";

type Change = (patch: Partial<Draft>) => void;

export function KindPicker({ value, onChange, allowRiddle = true }: { value: Draft["kind"]; onChange: (k: DraftKind) => void; allowRiddle?: boolean }) {
  return (
    <div className="st-kinds" role="radiogroup" aria-label="What's behind this door">
      {KINDS.filter((k) => allowRiddle || k.kind !== "riddle").map((k) => (
        <button
          key={k.kind}
          type="button"
          role="radio"
          aria-checked={value === k.kind}
          className={`st-chip${value === k.kind ? " on" : ""}`}
          onClick={() => onChange(k.kind)}
        >
          <span>{k.emoji}</span> {k.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="st-field">
      <span className="st-label">{label}</span>
      {children}
      {hint && <span className="st-hint">{hint}</span>}
    </label>
  );
}

const PROVIDER_NAME = { spotify: "Spotify", apple: "Apple Music", youtube: "YouTube" } as const;

function SongHint({ url }: { url: string }) {
  if (!url) return <>Paste a share link from Spotify, Apple Music or YouTube.</>;
  const e = songEmbed(url);
  return e ? <span className="st-ok">✓ {PROVIDER_NAME[e.provider]} link</span> : <span className="st-bad">That doesn&apos;t look like a Spotify, Apple Music or YouTube link</span>;
}

function VideoFields({ d, set }: { d: Draft; set: Change }) {
  const [mode, setMode] = useState<"upload" | "youtube">(d.url && !d.url.startsWith("/api/media/") ? "youtube" : "upload");
  return (
    <>
      <div className="st-seg">
        <button type="button" className={mode === "upload" ? "on" : ""} onClick={() => setMode("upload")}>
          Upload a clip
        </button>
        <button type="button" className={mode === "youtube" ? "on" : ""} onClick={() => setMode("youtube")}>
          YouTube link
        </button>
      </div>
      {mode === "upload" ? (
        <MediaField kind="video" value={d.url.startsWith("/api/media/") ? d.url : ""} onChange={(url) => set({ url })} />
      ) : (
        <Field
          label="YouTube link"
          hint={
            d.url && !youtubeId(d.url) ? (
              <span className="st-bad">That doesn&apos;t look like a YouTube link</span>
            ) : (
              "Tip: unlisted videos work. Some official music videos block playing on other sites; preview to check."
            )
          }
        >
          <input className="st-input" value={d.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://youtu.be/…" inputMode="url" />
        </Field>
      )}
    </>
  );
}

/** The inputs for one kind of door content. Used for doors and for a riddle's prize. */
export function DoorFields({ d, set, recipientName }: { d: Draft; set: Change; recipientName: string }) {
  switch (d.kind) {
    case "note":
      return (
        <>
          <Field label="Title (optional)">
            <input className="st-input" value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder={`Dear ${recipientName},`} />
          </Field>
          <Field label="Your letter" hint="Leave a blank line between paragraphs.">
            <textarea className="st-input" rows={8} value={d.body} onChange={(e) => set({ body: e.target.value })} />
          </Field>
        </>
      );
    case "photo":
      return (
        <>
          <MediaField kind="image" value={d.imageUrl} onChange={(imageUrl) => set({ imageUrl })} />
          <Field label="Caption (optional)" hint="Shown handwritten under the polaroid.">
            <input className="st-input" value={d.caption} onChange={(e) => set({ caption: e.target.value })} placeholder="Tahoe, Feb 2024 ⛷️" />
          </Field>
        </>
      );
    case "video":
      return <VideoFields d={d} set={set} />;
    case "song":
      return (
        <Field label="Song link" hint={<SongHint url={d.url} />}>
          <input className="st-input" value={d.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://open.spotify.com/track/…" inputMode="url" />
        </Field>
      );
    case "voice":
      return (
        <>
          <MediaField kind="audio" value={d.audioUrl} onChange={(audioUrl) => set({ audioUrl })} />
          <Field label="Label (optional)">
            <input className="st-input" value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="A little song for you" />
          </Field>
        </>
      );
    case "gift":
      return (
        <>
          <Field label="What is it?">
            <input className="st-input" value={d.label} onChange={(e) => set({ label: e.target.value })} placeholder="$25 Boba Gift Card" />
          </Field>
          <Field label="Code" hint="Starts blurred; they tap to reveal it.">
            <input className="st-input mono" value={d.code} onChange={(e) => set({ code: e.target.value })} placeholder="XXXX-XXXX-XXXX" />
          </Field>
          <Field label="Redemption link (optional)">
            <input className="st-input" value={d.link} onChange={(e) => set({ link: e.target.value })} placeholder="https://…" inputMode="url" />
          </Field>
        </>
      );
    case "coupon":
      return (
        <>
          <Field label="Good for…">
            <input className="st-input" value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="One breakfast in bed 🥞" />
          </Field>
          <Field label="Fine print (optional)">
            <input className="st-input" value={d.fine} onChange={(e) => set({ fine: e.target.value })} placeholder="Valid any Sunday. Coffee included." />
          </Field>
        </>
      );
    case "recipe":
      return (
        <>
          <Field label="Recipe name">
            <input className="st-input" value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="Grandma's Gingerbread" />
          </Field>
          <Field label="Ingredients" hint="One per line.">
            <textarea className="st-input" rows={5} value={d.ingredients} onChange={(e) => set({ ingredients: e.target.value })} />
          </Field>
          <Field label="Steps" hint="One per line.">
            <textarea className="st-input" rows={5} value={d.steps} onChange={(e) => set({ steps: e.target.value })} />
          </Field>
        </>
      );
    case "riddle": {
      const prize = d.prize ?? emptyDraft();
      const setPrize: Change = (patch) => set({ prize: { ...prize, ...patch } });
      return (
        <>
          <Field label="Riddle or question" hint="Questions only the two of you would know are extra fun.">
            <textarea className="st-input" rows={2} value={d.question} onChange={(e) => set({ question: e.target.value })} placeholder="Where did we first meet?" />
          </Field>
          <Field label="Accepted answers" hint="One per line. Capitals, punctuation and “the” don't matter.">
            <textarea className="st-input" rows={3} value={d.answers} onChange={(e) => set({ answers: e.target.value })} placeholder={"snow\nsnowflake"} />
          </Field>
          <div className="st-prize">
            <span className="st-label">🎁 Prize once they solve it</span>
            <KindPicker value={prize.kind} onChange={(kind) => setPrize({ kind })} allowRiddle={false} />
            {prize.kind && <DoorFields d={prize} set={setPrize} recipientName={recipientName} />}
          </div>
        </>
      );
    }
    default:
      return <p className="st-hint">Pick what goes behind this door ↑</p>;
  }
}
