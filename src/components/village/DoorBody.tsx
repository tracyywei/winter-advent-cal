"use client";

import { useRef, useState, type FormEvent } from "react";
import { songEmbed, youtubeId } from "@/lib/embeds";
import {
  MAX_NOTE_LENGTH,
  REACTION_EMOJIS,
  type DoorKind,
  type PrizeContent,
  type PublicDoorResponse,
  type Reaction,
} from "@/lib/types";
import type { Toast } from "./useToast";

/** Builds an API URL for this calendar, e.g. api("/door/3") → /api/c/<slug>/door/3 */
export type Api = (path: string) => string;

/** Sends a write for this calendar, e.g. post("/door/3/react", {...}). The studio preview swaps in an offline version. */
export type Post = <T = unknown>(path: string, body: unknown) => Promise<T>;

export async function postJSON<T = unknown>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(String(res.status));
  return res.json() as Promise<T>;
}

const KIND_LABEL: Record<DoorKind, string> = {
  note: "💌 A letter",
  photo: "📸 A photo",
  video: "🎬 A video",
  song: "🎵 A song",
  voice: "🎙️ A voice memo",
  gift: "🎁 A gift card",
  coupon: "🎟️ A coupon",
  recipe: "🍪 A recipe",
  riddle: "🧩 A riddle",
  empty: "🧝 Elves at work",
};

type Ctx = { day: number; post: Post; toast: Toast; fromName: string };

export default function DoorBody({
  door,
  celebrate,
  ...ctx
}: Omit<Ctx, "day"> & { door: PublicDoorResponse; celebrate: () => void }) {
  const c = door.content;
  const props = { ...ctx, day: door.day };
  return (
    <>
      <div className="va-card-head">
        <span className="va-chip">Ornament {door.day}</span>
        <span className="va-kind">{KIND_LABEL[c.kind]}</span>
      </div>

      {c.kind === "riddle" ? (
        <Riddle {...props} question={c.question} initialPrize={c.prize} reaction={door.reaction} celebrate={celebrate} />
      ) : c.kind === "empty" ? (
        <div className="va-elves">
          <div>🧝</div>
          <h3>{ctx.fromName}&apos;s elves are still wrapping this one</h3>
          <p className="va-small">Check back a little later!</p>
        </div>
      ) : (
        <Prize {...props} c={c} reaction={door.reaction} />
      )}

      {door.note && (
        <div className="va-tnote">
          <span className="from">a note from {ctx.fromName}</span>
          <p>{door.note}</p>
        </div>
      )}

      <Reactions {...props} initial={door.reaction} />
    </>
  );
}

function Prize({ c, reaction, ...ctx }: Ctx & { c: PrizeContent; reaction: Reaction | null }) {
  switch (c.kind) {
    case "note":
      return (
        <div className="va-letter">
          {c.title && <h3>{c.title}</h3>}
          {c.body.split(/\n{2,}/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
          <p className="va-sig">— {ctx.fromName}</p>
        </div>
      );
    case "photo":
      return (
        <figure className="va-polaroid">
          {/* eslint-disable-next-line @next/next/no-img-element -- user uploads from storage */}
          <img src={c.imageUrl} alt={c.caption ?? `A photo from ${ctx.fromName}`} />
          {c.caption && <figcaption>{c.caption}</figcaption>}
        </figure>
      );
    case "video": {
      const id = youtubeId(c.url);
      return id ? (
        <>
          <div className="va-embed16">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${id}`}
              title="Video"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
          <YouTubeFallback url={c.url} />
        </>
      ) : (
        <video className="va-video" src={c.url} controls playsInline preload="metadata" />
      );
    }
    case "song": {
      const embed = songEmbed(c.url);
      if (!embed)
        return (
          <a className="va-btn" href={c.url} target="_blank" rel="noopener noreferrer">
            🎵 Play the song ↗
          </a>
        );
      return embed.provider === "youtube" ? (
        <>
          <div className="va-embed16">
            <iframe src={embed.src} title="Song" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
          </div>
          <YouTubeFallback url={c.url} />
        </>
      ) : (
        <iframe
          className="va-song"
          src={embed.src}
          height={embed.height}
          title="Song"
          allow="autoplay *; encrypted-media *; clipboard-write; fullscreen; picture-in-picture"
          loading="lazy"
        />
      );
    }
    case "voice":
      return <VoicePlayer src={c.audioUrl} title={c.title} />;
    case "gift":
      return <GiftCard {...ctx} c={c} />;
    case "coupon":
      return <Coupon {...ctx} c={c} initialRedeemed={!!reaction?.redeemed} />;
    case "recipe":
      return (
        <div className="va-letter va-recipe">
          <h3>{c.title}</h3>
          <b>You&apos;ll need</b>
          <ul>
            {c.ingredients.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
          <b>Steps</b>
          <ol>
            {c.steps.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ol>
        </div>
      );
  }
}

/** Some videos (often official music videos) refuse to play inside other sites. */
function YouTubeFallback({ url }: { url: string }) {
  return (
    <p className="va-small">
      Not playing?{" "}
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>
        Open it on YouTube ↗
      </a>
    </p>
  );
}

const BARS = Array.from({ length: 26 }, (_, i) => 22 + Math.round(Math.abs(Math.sin(i * 1.7)) * 78));
const fmt = (s: number) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00");

function VoicePlayer({ src, title }: { src: string; title?: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const progress = duration ? time / duration : 0;

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  };

  return (
    <>
      <div className={`va-voice${playing ? " playing" : ""}`}>
        <button type="button" className="va-play" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="va-wave" aria-hidden="true">
          {BARS.map((h, i) => (
            <i key={i} className={i / BARS.length < progress ? "on" : ""} style={{ height: `${h}%`, animationDelay: `${(i % 7) * 0.08}s` }} />
          ))}
        </div>
        <span className="va-len">{fmt(time > 0 ? time : duration)}</span>
      </div>
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setTime(0);
        }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
      {title && <p className="va-small">{title}</p>}
    </>
  );
}

function GiftCard({ c, toast }: Ctx & { c: Extract<PrizeContent, { kind: "gift" }> }) {
  const [shown, setShown] = useState(!c.code);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(c.code ?? "");
      toast("Copied! 🎁");
    } catch {
      toast("Press and hold the code to copy it");
    }
  };
  return (
    <div className="va-gift">
      <div className="g-label">🎁 {c.label}</div>
      {c.code && <div className={`g-code${shown ? "" : " blurred"}`}>{c.code}</div>}
      <div>
        {c.code &&
          (shown ? (
            <button type="button" className="va-btn" onClick={copy}>
              Copy code
            </button>
          ) : (
            <button type="button" className="va-btn" onClick={() => setShown(true)}>
              Tap to reveal
            </button>
          ))}
        {c.link && shown && (
          <a className="va-btn" href={c.link} target="_blank" rel="noopener noreferrer">
            Redeem ↗
          </a>
        )}
      </div>
    </div>
  );
}

function Coupon({ c, day, post, toast, initialRedeemed }: Ctx & { c: Extract<PrizeContent, { kind: "coupon" }>; initialRedeemed: boolean }) {
  const [redeemed, setRedeemed] = useState(initialRedeemed);
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    try {
      await post(`/door/${day}/react`, { redeemed: !redeemed });
      setRedeemed(!redeemed);
      if (!redeemed) toast("Redeemed! 🎉");
    } catch {
      toast("Hmm, that didn't save. Try again?");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={`va-coupon${redeemed ? " redeemed" : ""}`}>
      <div className="c-top">COUPON</div>
      <h3>{c.title}</h3>
      {c.fine && <p>{c.fine}</p>}
      <button type="button" className="va-btn" onClick={toggle} disabled={busy}>
        {redeemed ? "Undo" : "Mark as redeemed"}
      </button>
    </div>
  );
}

function Riddle({
  question,
  initialPrize,
  reaction,
  celebrate,
  ...ctx
}: Ctx & { question: string; initialPrize?: PrizeContent; reaction: Reaction | null; celebrate: () => void }) {
  const [prize, setPrize] = useState(initialPrize);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || busy) return;
    setBusy(true);
    try {
      const r = await ctx.post<{ correct: boolean; prize?: PrizeContent }>(`/door/${ctx.day}/solve`, { answer });
      if (r.correct && r.prize) {
        setPrize(r.prize);
        celebrate();
      } else {
        form.current?.animate(
          [{ transform: "none" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(-3px)" }, { transform: "none" }],
          { duration: 400 },
        );
        ctx.toast("Not quite! Try again ❄️");
      }
    } catch {
      ctx.toast("The elves dropped that. Try again?");
    } finally {
      setBusy(false);
    }
  };

  if (prize)
    return (
      <div className="va-riddle">
        <div className="solved">✅ You solved: “{question}”</div>
        <Prize {...ctx} c={prize} reaction={reaction} />
      </div>
    );

  return (
    <div className="va-riddle">
      <p className="q">{question}</p>
      <form ref={form} className="va-inline-form" onSubmit={submit}>
        <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer…" aria-label="Your answer" autoComplete="off" />
        <button className="va-btn" disabled={busy}>
          Unlock
        </button>
      </form>
    </div>
  );
}

function Reactions({ day, post, toast, fromName, initial }: Ctx & { initial: Reaction | null }) {
  const [emoji, setEmoji] = useState(initial?.emoji ?? "");
  const [note, setNote] = useState("");
  const [sentNote, setSentNote] = useState(initial?.note ?? "");
  const [busy, setBusy] = useState(false);

  const pick = async (e: string) => {
    const prev = emoji;
    const next = emoji === e ? "" : e;
    setEmoji(next);
    try {
      await post(`/door/${day}/react`, { emoji: next });
      if (next) toast(`Sent ${next} to ${fromName}`);
    } catch {
      setEmoji(prev);
      toast("Couldn't send that one. Try again?");
    }
  };

  const send = async (ev: FormEvent) => {
    ev.preventDefault();
    const text = note.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      await post(`/door/${day}/react`, { note: text });
      setSentNote(text);
      setNote("");
      toast(`Sent to ${fromName} ✨`);
    } catch {
      toast("Couldn't send that one. Try again?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="va-react">
      <p>Send {fromName} a reaction</p>
      <div className="va-emojis">
        {REACTION_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            className={`va-emo${emoji === e ? " on" : ""}`}
            onClick={() => pick(e)}
            aria-pressed={emoji === e}
            aria-label={`React with ${e}`}
          >
            {e}
          </button>
        ))}
      </div>
      {sentNote ? (
        <p className="va-sent">
          Sent ✨ <q>{sentNote}</q>
          <button
            type="button"
            className="va-linkbtn inline"
            onClick={() => {
              setNote(sentNote);
              setSentNote("");
            }}
          >
            edit
          </button>
        </p>
      ) : (
        <form className="va-inline-form" onSubmit={send}>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={MAX_NOTE_LENGTH}
            placeholder={`Leave ${fromName} a little note…`}
            aria-label={`Note to ${fromName}`}
          />
          <button className="va-btn" disabled={busy || !note.trim()}>
            Send
          </button>
        </form>
      )}
    </div>
  );
}
